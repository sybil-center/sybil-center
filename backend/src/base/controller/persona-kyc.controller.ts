import { HttpServer } from "../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { personaWebhookRoute } from "./routes/persona-kyc.route.js";
import { FastifyRequest } from "fastify";
import { IssuerManager } from "../../issuers/zkc/issuer.manager.js";

type Dependencies = {
  httpServer: HttpServer;
  issuerManager: IssuerManager
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "issuerManager"
];

export function personaKYCController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    issuerManager
  } = contextUtil.from(tokens, injector);

  fastify.route({
    ...personaWebhookRoute,
    config: { rawBody: true },
    handler: async (req: FastifyRequest, resp) => {
      await issuerManager.handleWebhook("passport", req);
      resp.statusCode = 200;
      resp.send({ message: "ok" });
    }
  });
}
