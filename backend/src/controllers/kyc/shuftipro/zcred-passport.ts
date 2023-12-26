import { PrincipalIssuer } from "../../../issuers/zcred/index.js";
import { HttpServer } from "../../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../../util/context.util.js";
import { CredType } from "@zcredjs/core";

type Dependencies = {
  principalIssuer: PrincipalIssuer,
  httpServer: HttpServer
}

const TOKENS: (keyof Dependencies)[] = [
  "principalIssuer",
  "httpServer"
];

const credentialType: CredType = "passport";

export const SHUFTI_PASSPORT_ISSUER_ENDPOINT = `/api/v1/zcred/issuers/${credentialType}/kyc/shuftipro`;

export function shuftiproPassportIssuerController(injector: Injector<Dependencies>) {
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
      await principalIssuer.getIssuer(credentialType)?.handleWebhook?.(req);
      return { message: "ok" };
    }
  });
}
