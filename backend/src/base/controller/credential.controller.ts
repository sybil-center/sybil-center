import type { IssuerContainer } from "../service/issuer-container.js";
import type { FastifyInstance } from "fastify";
import type { OAuthQueryCallBack } from "../service/credentials.js";
import { genVCRotes } from "./routes/credential.route.js";
import { vcOAuthCallback } from "./routes/callback.route.js";

import { OAuthState } from "../types/oauth.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { CanIssueReq, IssueReq } from "@sybil-center/sdk/types";
import { ClientError } from "../../backbone/errors.js";
import { ChallengeReq } from "../types/challenge.js";

type ConfigFields = {
  pathToExposeDomain: URL;
  customSizeLimit: number;
};

function validateCustomSize(custom: object, sizeLimit: number): void {
  const customSize = new Uint8Array(Buffer.from(JSON.stringify(custom))).length;
  const customOutOfLimit = customSize > sizeLimit;
  if (customOutOfLimit) throw new ClientError(
    `"custom" property is too large. Bytes limit is ${sizeLimit}`
  );
}

export function credentialController(
  fastifyServ: FastifyInstance,
  issuerContainer: IssuerContainer,
  config: ConfigFields
): FastifyInstance {
  genVCRotes.forEach((routes) => {
    // initialize issuer endpoints
    const issueRoute = routes.issue;
    // @ts-ignore
    fastifyServ.route<{ Body: IssueReq }>({
      method: issueRoute.method,
      url: issueRoute.url,
      schema: issueRoute.schema,
      handler: (req) => {
        const credentialRequest = req.body;
        return issuerContainer.issue(routes.credentialType, credentialRequest);
      }
    });

    // initialize payload endpoints
    const challengeRoute = routes.challenge;
    if (challengeRoute) {
      // @ts-ignore
      fastifyServ.route<{ Body: ChallengeReq }>({
        method: challengeRoute.method,
        url: challengeRoute.url,
        schema: challengeRoute.schema,
        preHandler: async (req) => {
          const { custom } = req.body;
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
      fastifyServ.route<{ Querystring: CanIssueReq }>({
        method: canIssueRoute.method,
        url: canIssueRoute.url,
        schema: canIssueRoute.schema,
        handler: async (req) => {
          const canIssueEntry = req.query;
          return issuerContainer.canIssue(routes.credentialType, canIssueEntry);
        }
      });
    }
  });

  // Init oauth callback endpoint
  fastifyServ.route<{ Querystring: OAuthQueryCallBack }>({
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

  return fastifyServ;
}


