import type { IssuerContainer } from "../service/issuer-container.js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { OAuthQueryCallBack } from "../service/credentials.js";
import { genVCRotes, verifyCredentialRoute } from "./routes/credential.route.js";
import { vcOAuthCallback } from "./routes/callback.route.js";

import { OAuthState } from "../types/oauth.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { CanIssueReq, IssueReq } from "@sybil-center/sdk/types";
import { ClientError } from "../../backbone/errors.js";
import { ChallengeReq } from "../types/challenge.js";
import { Credential } from "../types/credential.js";
import { CredentialVerifier } from "../service/credential-verifivator.js";
import { Config } from "../../backbone/config.js";
import { ApiKeyService } from "../service/api-key.service.js";

function validateCustomSize(custom: object, sizeLimit: number): void {
  const customSize = new Uint8Array(Buffer.from(JSON.stringify(custom))).length;
  const customOutOfLimit = customSize > sizeLimit;
  if (customOutOfLimit) throw new ClientError(
    `"custom" property is too large. Bytes limit is ${sizeLimit}`
  );
}

export function credentialController(
  fastify: FastifyInstance,
  issuerContainer: IssuerContainer,
  config: Config,
  verifier: CredentialVerifier,
  apiKeyService: ApiKeyService
): FastifyInstance {

  const isFrontend = async (req: FastifyRequest): Promise<boolean> => {
    try {
      const frontendDomain = config.frontendOrigin.origin;
      const referer = req.headers.referer;
      if (!referer) return false;
      const refererDomain = new URL(referer).origin;
      return refererDomain === frontendDomain;
    } catch (e) {
      return false;
    }
  };

  const isAPIkey = async (req: FastifyRequest): Promise<boolean> => {
    const authorization = req.headers.authorization;
    if (!authorization) return false;
    const key = authorization.split(" ")[1];
    if (!key) return false;
    await apiKeyService.verify(key);
    return true;
  };

  const authorize = async (req: FastifyRequest): Promise<void> => {
    const isAuthorized = await isFrontend(req) || await isAPIkey(req);
    if (!isAuthorized) throw new ClientError("Forbidden", 403);
  };

  genVCRotes.forEach((routes) => {
    // initialize issuer endpoints
    const issueRoute = routes.issue;
    // @ts-ignore
    fastify.route<{ Body: IssueReq }>({
      method: issueRoute.method,
      url: issueRoute.url,
      schema: issueRoute.schema,
      preHandler: async (req) => await authorize(req),
      handler: (req) => {
        const credentialRequest = req.body;
        return issuerContainer.issue(routes.credentialType, credentialRequest);
      }
    });

    // initialize payload endpoints
    const challengeRoute = routes.challenge;
    if (challengeRoute) {
      // @ts-ignore
      fastify.route<{ Body: ChallengeReq }>({
        method: challengeRoute.method,
        url: challengeRoute.url,
        schema: challengeRoute.schema,
        preHandler: async (req) => {
          await authorize(req);
          const custom = req.body.custom;
          if (custom) validateCustomSize(custom, config.customSizeLimit);
          req.body = ThrowDecoder
            .decode(ChallengeReq, req.body, new ClientError("Bad request"));
        },
        handler: async (req) => {
          const challengeReq = req.body;
          return issuerContainer.getChallenge(routes.credentialType, challengeReq);
        }
      });
    }

    const canIssueRoute = routes.canIssue;
    if (canIssueRoute) {
      // @ts-ignore
      fastify.route<{ Querystring: CanIssueReq }>({
        method: canIssueRoute.method,
        url: canIssueRoute.url,
        schema: canIssueRoute.schema,
        // FUTURE COMMENT: `Can Issue` endpoint has to be accepted with `apikey`
        // even if `only secret key` flag set to `true`
        preHandler: async (req) => await authorize(req),
        handler: async (req) => {
          const canIssueEntry = req.query;
          return issuerContainer.canIssue(routes.credentialType, canIssueEntry);
        }
      });
    }
  });

  // Init oauth callback endpoint
  fastify.route<{ Querystring: OAuthQueryCallBack }>({
    method: vcOAuthCallback.method,
    url: vcOAuthCallback.url,
    schema: vcOAuthCallback.schema,
    handler: async (req, resp) => {
      const query = req.query;
      const defaultRedirect = new URL(
        "/oauth/authorized",
        config.pathToExposeDomain
      );
      try {
        const state = ThrowDecoder.decode(OAuthState, query.state);
        const redirectUrl = await issuerContainer.handleOAuthCallback(
          query.code,
          state
        );
        const redirectTo = redirectUrl ? redirectUrl : defaultRedirect;
        resp.redirect(redirectTo.href);
      } catch (e) {
        resp.redirect(defaultRedirect.href);
      }
    }
  });

  // Init verify credential endpoint
  fastify.route<{ Body: Credential }>({
    method: verifyCredentialRoute.method,
    url: verifyCredentialRoute.url,
    schema: verifyCredentialRoute.schema,
    preHandler: async (req) => {
      req.body = ThrowDecoder
        .decode(Credential, req.body, new ClientError("Bad request"));
    },
    handler: async (req) => {
      return await verifier.verify(req.body);
    }
  });

  return fastify;
}


