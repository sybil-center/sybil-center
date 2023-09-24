import { HttpServer } from "../../backbone/http-server.js";
import { ZkcIssuerManager } from "../../issuers/zkc/zkc.issuer-manager.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { personaWebhookRoute } from "./routes/persona-kyc.route.js";
import { FastifyRequest } from "fastify";

type Dependencies = {
  httpServer: HttpServer;
  zkcIssuerManager: ZkcIssuerManager
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "zkcIssuerManager"
];

export function personaKYCController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    zkcIssuerManager
  } = contextUtil.from(tokens, injector);

  fastify.route({
    ...personaWebhookRoute,
    handler: async (req: FastifyRequest, resp) => {
      req.raw
      await zkcIssuerManager.handleWebhook("Passport", req);
      resp.statusCode = 200;
      resp.send({ message: "ok" });
    }
  });
}
