import type { IssuerContainer } from "../service/issuer-container.js";
import type { FastifyInstance } from "fastify";
import type { OAuthQueryCallBack } from "../credentials.js";
import { genVCRotes } from "./routes/gen-vc-routes.js";
import { vcOAuthCallback } from "./routes/callback-routes.js";
import { ClientError } from "../../backbone/errors.js";
import { OAuthState } from "../oauth.js";
import { ThrowDecoder } from "../throw-decoder.js";
import { AnyObject } from "../../util/model.util.js";

type ConfigFields = {
  pathToExposeDomain: URL;
  customSizeLimit: number;
};

function validateCustomSize(custom: object, sizeLimit: number): void {
  const customSize = new Uint8Array(Buffer.from(JSON.stringify(custom))).length;
  const customOutOfLimit = customSize > sizeLimit;
  if (customOutOfLimit) {
    throw new ClientError(
      `"custom" property is too large. Bytes limit is ${sizeLimit}`
    );
  }
}

export function vcController(
  fastifyServ: FastifyInstance,
  issuerContainer: IssuerContainer,
  config: ConfigFields
): FastifyInstance {
  genVCRotes.forEach((vcRoutes) => {
    // initialize issuer endpoints
    const issueRoute = vcRoutes.issue;
    // @ts-ignore
    fastifyServ.route({
      method: issueRoute.method,
      url: issueRoute.url,
      schema: issueRoute.schema,
      handler: (req) => {
        const credentialRequest = req.body;
        return issuerContainer.issue(vcRoutes.vcType, credentialRequest);
      }
    });

    // initialize payload endpoints
    const payloadRoute = vcRoutes.payload;
    if (payloadRoute) {
      // @ts-ignore
      fastifyServ.route<{ Body: { custom?: object } }>({
        method: payloadRoute.method,
        url: payloadRoute.url,
        schema: payloadRoute.schema,
        preHandler: async (request) => {
          const custom = request.body?.custom;
          if (custom) validateCustomSize(custom, config.customSizeLimit);
        },
        handler: async (req) => {
          const headers = req.headers;
          const body = req.body;
          const query = req.query;
          return issuerContainer.getIssueVCPayload(vcRoutes.vcType, {
            headers: headers,
            body: body,
            query: query
          });
        }
      });
    }

    const canIssueRoute = vcRoutes.canIssue;
    if (canIssueRoute) {
      // @ts-ignore
      fastifyServ.route({
        method: canIssueRoute.method,
        url: canIssueRoute.url,
        schema: canIssueRoute.schema,
        handler: async (req) => {
          const canIssueEntry = req.query;
          return issuerContainer.canIssue(vcRoutes.vcType, canIssueEntry);
        }
      });
    }

    const ownerProofRoute = vcRoutes.ownerProof;
    if (ownerProofRoute) {
      fastifyServ.route<{ Body: AnyObject }>({
        method: ownerProofRoute.method,
        url: ownerProofRoute.url,
        schema: ownerProofRoute.schema,
        handler: async (req, resp) => {
          const ownerProof = req.body;
          return await issuerContainer.handleOwnerProof(vcRoutes.vcType, ownerProof);
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


