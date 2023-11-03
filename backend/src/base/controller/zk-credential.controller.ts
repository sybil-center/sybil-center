import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { ZkcRoutes } from "./routes/zkc.routes.js";
import { HttpServer } from "../../backbone/http-server.js";
import { CanIssueReq, IssueReq, SybilChallengeReq } from "@sybil-center/zkc-core";
import { IssuerManager } from "../../issuers/zkc/issuer.manager.js";

type Dependencies = {
  httpServer: HttpServer
  issuerManager: IssuerManager
}

const tokens: (keyof Dependencies)[] = [
  "issuerManager",
  "httpServer"
];

export function zkCredController(injector: Injector<Dependencies>) {

  const {
    httpServer: { fastify },
    issuerManager: issuerManager,
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
        handler: async ({ body }) => issuerManager.getChallenge(schemaName, body)
      });
    }

    if (canIssueRoute) {
      fastify.route<{ Querystring: CanIssueReq }>({
        ...canIssueRoute,
        handler: async ({ query }) => issuerManager.canIssue(schemaName, query)
      });
    }

    fastify.route<{ Body: IssueReq }>({
      ...issueRoute,
      handler: async ({ body }) => issuerManager.issueCred(schemaName, body)
    });
  });
}
