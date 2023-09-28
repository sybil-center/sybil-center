import { Injector } from "typed-inject";
import { ZkcIssuerManager } from "../../issuers/zkc/zkc.issuer-manager.js";
import { contextUtil } from "../../util/context.util.js";
import { ZkcRoutes } from "./routes/zkc.routes.js";
import { HttpServer } from "../../backbone/http-server.js";
import { Raw, ZkcCanIssueReq, ZkcChallengeReq, ZkcIssueReq } from "../types/zkc.issuer.js";
import { ZKC } from "../../util/zk-credentials/index.js";

type Dependencies = {
  httpServer: HttpServer
  zkcIssuerManager: ZkcIssuerManager
}

const tokens: (keyof Dependencies)[] = [
  "zkcIssuerManager",
  "httpServer"
];

export function zkCredentialController(injector: Injector<Dependencies>) {

  const {
    httpServer: { fastify },
    zkcIssuerManager: issuerManager,
  } = contextUtil.from(tokens, injector);

  ZkcRoutes.forEach(({
    challenge: challengeRoute,
    canIssue: canIssueRoute,
    issue: issueRoute,
    schemaName
  }) => {
    if (challengeRoute) {
      fastify.route<{ Body: Raw<ZkcChallengeReq> }>({
        ...challengeRoute,
        handler: async ({ body }) => {
          const subjectId = {
            k: body.subjectId.k,
            t: ZKC.idType.fromAlias(body.subjectId.t)
          };
          const challengeReq: ZkcChallengeReq = {
            ...body,
            subjectId: subjectId
          };
          return await issuerManager.getChallenge(schemaName, challengeReq);
        }
      });
    }

    if (canIssueRoute) {
      fastify.route<{ Querystring: ZkcCanIssueReq }>({
        ...canIssueRoute,
        handler: async ({ query }) => issuerManager.canIssue(schemaName, query)
      });
    }

    fastify.route<{ Body: ZkcIssueReq }>({
      ...issueRoute,
      handler: async ({ body }) => issuerManager.issue(schemaName, body)
    });
  });
}
