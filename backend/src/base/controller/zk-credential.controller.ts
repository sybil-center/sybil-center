import { Injector } from "typed-inject";
import { ZkcIssuerManager } from "../../issuers/zkc/zkc.issuer-manager.js";
import { contextUtil } from "../../util/context.util.js";
import { ZkcRoutes } from "./routes/zkc.routes.js";
import { HttpServer } from "../../backbone/http-server.js";
import { ZkcCanIssueReq, ZkcChallengeReq, ZkcIssueReq } from "../types/zkc.issuer.js";

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
      fastify.route<{ Body: ZkcChallengeReq }>({
        ...challengeRoute,
        handler: async ({ body }) =>
          issuerManager.getChallenge(schemaName, body)
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
