import { HttpServer } from "../../../backbone/http-server.js";
import { contextUtil } from "../../../util/context.util.js";
import { Injector } from "typed-inject";
import { IssuerSupervisor } from "../../issuer-supervisor.js";

type Dependencies = {
  httpServer: HttpServer
  issuerSupervisor: IssuerSupervisor
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "issuerSupervisor"
];

export function StubKYCPassportController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    issuerSupervisor
  } = contextUtil.from(tokens, injector);

  fastify.route({
    method: "GET",
    url: "/api/v1/stub-kyc/verification",
    handler: async (_, resp) => {
      await resp.sendFile("kyc/stub.html");
    }
  });

  fastify.route({
    method: "GET",
    url: "/api/v1/stub-kyc/webhook",
    handler: async (req) => {
      await issuerSupervisor.getIssuer("passport").handleWebhook?.(req);
      return { message: "ok" };
    }
  });
}
