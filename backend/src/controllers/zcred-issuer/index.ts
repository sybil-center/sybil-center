import { HttpServer } from "../../backbone/http-server.js";
import { PrincipalIssuer } from "../../issuers/zcred/index.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { ZCRED_ISSUERS_ROUTES } from "./routes.js";
import { CanIssueReq, IssueReq, ZChallengeReq, zcredjs } from "@zcredjs/core";

type Dependencies = {
  httpServer: HttpServer
  principalIssuer: PrincipalIssuer
}

const TOKENS: (keyof Dependencies)[] = [
  "principalIssuer",
  "httpServer",
];

export function issuersController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    principalIssuer,
  } = contextUtil.from(TOKENS, injector);

  for (const routes of ZCRED_ISSUERS_ROUTES) {
    const {
      credentialType,
      challenge: challengeRoute,
      canIssue: canIssueRoute,
      issue: issueRoute
    } = routes;

    fastify.route<{ Body: ZChallengeReq }>({
      ...challengeRoute,
      handler: async ({ body }) => {
        const normalizedId = zcredjs.normalizeId(body.subject.id);
        return principalIssuer
          .getIssuer(credentialType)
          .getChallenge({ ...body, subject: { id: normalizedId } });
      }
    });

    fastify.route<{ Body: CanIssueReq }>({
      ...canIssueRoute,
      handler: async ({ body }) => {
        return principalIssuer
          .getIssuer(credentialType)
          .canIssue(body);
      }
    });

    fastify.route<{ Body: IssueReq }>({
      ...issueRoute,
      handler: async ({ body }) => {
        return principalIssuer
          .getIssuer(credentialType)
          .issue(body);
      }
    });
  }
}
