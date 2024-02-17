import { HttpServer } from "../../../backbone/http-server.js";
import { contextUtil } from "../../../util/context.util.js";
import { Injector } from "typed-inject";
import { PrincipalIssuer } from "../../index.js";

type Dependencies = {
  httpServer: HttpServer
  principalIssuer: PrincipalIssuer
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "principalIssuer"
];

export function StubKYCPassportController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    principalIssuer
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
      await principalIssuer.getIssuer("passport").handleWebhook?.(req);
      return { message: "ok" };
    }
  });
}
