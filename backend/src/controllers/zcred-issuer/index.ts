import { HttpServer } from "../../backbone/http-server.js";
import { PrincipalIssuer } from "../../issuers/zcred/index.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { ZCRED_ISSUERS_ROUTES } from "./routes.js";
import { CanIssueReq, IssueReq, StrictChallengeReq, zcredjs } from "@zcredjs/core";

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
      info: infoRoute,
      challenge: challengeRoute,
      canIssue: canIssueRoute,
      issue: issueRoute,
    } = routes;

    fastify.route({
      ...infoRoute,
      handler: async () => {
        return await principalIssuer.getIssuer(credentialType).getInfo();
      }
    });

    fastify.route<{ Body: StrictChallengeReq }>({
      ...challengeRoute,
      handler: async ({ body }) => {
        const normalizedId = zcredjs.normalizeId(body.subject.id);
        return await principalIssuer
          .getIssuer(credentialType)
          .getChallenge({ ...body, subject: { id: normalizedId } });
      }
    });

    fastify.route<{ Body: CanIssueReq }>({
      ...canIssueRoute,
      handler: async ({ body }) => {
        return await principalIssuer
          .getIssuer(credentialType)
          .canIssue(body);
      }
    });

    fastify.route<{ Body: IssueReq }>({
      ...issueRoute,
      handler: async ({ body }) => {
        return await principalIssuer
          .getIssuer(credentialType)
          .issue(body);
      }
    });
  }
}
