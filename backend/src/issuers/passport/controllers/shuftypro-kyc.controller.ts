import { HttpServer } from "../../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../../util/context.util.js";
import { IssuerSupervisor } from "../../issuer-supervisor.js";

type Dependencies = {
  issuerSupervisor: IssuerSupervisor,
  httpServer: HttpServer
}

const TOKENS: (keyof Dependencies)[] = [
  "issuerSupervisor",
  "httpServer"
];

const PASSPORT_TYPE = "passport";

export const SHUFTI_PASSPORT_ISSUER_ENDPOINT = `/issuers/${PASSPORT_TYPE}/webhook/kyc/shuftipro`;

export function ShuftyproKYCPassportController(injector: Injector<Dependencies>) {
  const {
    issuerSupervisor,
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
      await issuerSupervisor.getIssuer("passport")?.handleWebhook?.(req);
      return { message: "ok" };
    }
  });
}
