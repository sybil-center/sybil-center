import { PrincipalIssuer } from "../../index.js";
import { HttpServer } from "../../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../../util/context.util.js";
import { CredentialType } from "../../../services/sybiljs/types/index.js";

type Dependencies = {
  principalIssuer: PrincipalIssuer,
  httpServer: HttpServer
}

const TOKENS: (keyof Dependencies)[] = [
  "principalIssuer",
  "httpServer"
];

const PASSPORT_TYPE: CredentialType = "passport";

export const SHUFTI_PASSPORT_ISSUER_ENDPOINT = `/api/v1/zcred/issuers/${PASSPORT_TYPE}/kyc/shuftipro/webhook`;

export function ShuftyproKYCPassportController(injector: Injector<Dependencies>) {
  const {
    principalIssuer,
    httpServer: { fastify }
  } = contextUtil.from(TOKENS, injector);

  fastify.route({
    method: "POST",
    url: SHUFTI_PASSPORT_ISSUER_ENDPOINT,
    schema: {
      body: { type: "object" }
    },
    config: { rawBody: true },
    handler: async (req) => {
      await principalIssuer.getIssuer(PASSPORT_TYPE)?.handleWebhook?.(req);
      return { message: "ok" };
    }
  });
}
