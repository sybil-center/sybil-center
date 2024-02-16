import type { VCIssuerContainer } from "../services/vc/vc-issuer-container.js";
import { genVCRotes, verifyCredentialRoute } from "./routes/vc-credential.route.js";
import { ThrowDecoder } from "../util/throw-decoder.util.js";
import { CanIssueReq, IssueReq } from "@sybil-center/sdk/types";
import { ClientErr } from "../backbone/errors.js";
import { ChallengeReq } from "../services/vc/vc-challenge.js";
import { VCCredential } from "../services/vc/consts/vc-credential.js";
import { VCCredentialVerifier } from "../services/vc/vc-credential-verifivator.js";
import { Config } from "../backbone/config.js";
import { HttpServer } from "../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../util/context.util.js";
import { GateBuilder, OpenResult } from "../services/gate-builder.js";

type Dependencies = {
  httpServer: HttpServer;
  issuerContainer: VCIssuerContainer;
  config: Config;
  vcCredentialVerifier: VCCredentialVerifier;
  gateBuilder: GateBuilder;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "issuerContainer",
  "config",
  "vcCredentialVerifier",
  "gateBuilder"
];

export function VCCredentialController(injector: Injector<Dependencies>): void {
  const {
    httpServer: { fastify },
    config,
    issuerContainer,
    vcCredentialVerifier: verifier,
    gateBuilder: gateBuilder
  } = contextUtil.from(tokens, injector);

  function validateCustomSize(custom: object): OpenResult {
    const customSize = new Uint8Array(Buffer.from(JSON.stringify(custom))).length;
    const customOutOfLimit = customSize > config.customSizeLimit;
    if (customOutOfLimit) {
      return {
        opened: false,
        reason: `"custom" property is too large. Bytes limit is ${config.customSizeLimit}`,
        errStatus: 400
      };
    }
    return { opened: true, reason: "" };
  }

  genVCRotes.forEach((routes) => {

    // initialize payload endpoints
    const challengeRoute = routes.challenge;
    if (challengeRoute) {
      fastify.route<{ Body: ChallengeReq }>({
        ...challengeRoute,
        preHandler: async (req) => {
          await gateBuilder.build()
            .checkFrontend(req)
            .openOne(({ reason, errStatus }) => {
              throw new ClientErr({ message: reason, statusCode: errStatus });
            });
          await gateBuilder.build()
            .setLock(async () => {
              const custom = req.body.custom;
              if (custom) return validateCustomSize(custom);
              return { opened: true, reason: "" };
            }).openAll(({ reason, errStatus }) => {
              throw new ClientErr({ message: reason, statusCode: errStatus });
            });
          req.body = ThrowDecoder
            .decode(ChallengeReq, req.body, new ClientErr("Bad request"));
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
        preHandler: async (req) => {
          await gateBuilder.build()
            .checkFrontend(req)
            .openOne(({ reason, errStatus }) => {
              throw new ClientErr({ message: reason, statusCode: errStatus });
            });
        },
        handler: async (req) => {
          const canIssueEntry = req.query;
          return issuerContainer.canIssue(routes.credentialType, canIssueEntry);
        }
      });
    }

    // initialize issuer endpoints
    const issueRoute = routes.issue;
    // @ts-ignore
    fastify.route<{ Body: IssueReq }>({
      method: issueRoute.method,
      url: issueRoute.url,
      schema: issueRoute.schema,
      preHandler: async (req) => {
        await gateBuilder.build()
          .checkFrontend(req)
          .openOne(({ reason, errStatus }) => {
            throw new ClientErr({ message: reason, statusCode: errStatus });
          })
        ;
      },
      handler: (req) => {
        const credentialRequest = req.body;
        return issuerContainer.issue(routes.credentialType, credentialRequest);
      }
    });
  });

  // Init verify credential endpoint
  fastify.route<{ Body: VCCredential }>({
    method: verifyCredentialRoute.method,
    url: verifyCredentialRoute.url,
    schema: verifyCredentialRoute.schema,
    preHandler: async (req) => {
      req.body = ThrowDecoder
        .decode(VCCredential, req.body, new ClientErr({
          message: "Bad request",
          place: VCCredentialController.name,
          description: "Verify credential controller bad request"
        }));
    },
    handler: async (req) => {
      return await verifier.verify(req.body);
    }
  });
}


