import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { ZkcRoutes } from "./routes/zkc.routes.js";
import { HttpServer } from "../../backbone/http-server.js";
import { CanIssueReq, IssueReq, normalizeID, SybilChallengeReq } from "@sybil-center/zkc-core";
import { ZKCIssuerManager } from "../../issuers/zkc/zkc-issuer.manager.js";

type Dependencies = {
  httpServer: HttpServer
  zkcIssuerManager: ZKCIssuerManager
}

const tokens: (keyof Dependencies)[] = [
  "zkcIssuerManager",
  "httpServer",
];

export function zkCredController(injector: Injector<Dependencies>) {

  const {
    httpServer: { fastify },
    zkcIssuerManager,
  } = contextUtil.from(tokens, injector);

  ZkcRoutes.forEach(({
    challenge: challengeRoute,
    canIssue: canIssueRoute,
    issue: issueRoute,
    schemaName
  }) => {
    if (challengeRoute) {
      fastify.route<{ Body: SybilChallengeReq }>({
        ...challengeRoute,
        handler: async ({ body }) => {
          const challengeReq: SybilChallengeReq = {
            ...body,
            subjectId: normalizeID(body.subjectId)
          };
          return zkcIssuerManager.getChallenge(schemaName, challengeReq);
        }
      });
    }

    if (canIssueRoute) {
      fastify.route<{ Body: CanIssueReq }>({
        ...canIssueRoute,
        handler: async ({ body }) => {
          return zkcIssuerManager.canIssue(schemaName, body);
        }
      });
    }

    fastify.route<{ Body: IssueReq }>({
      ...issueRoute,
      handler: async ({ body }) => zkcIssuerManager.issueCred(schemaName, body)
    });
  });
}
