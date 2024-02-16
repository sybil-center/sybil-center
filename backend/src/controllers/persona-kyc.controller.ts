import { HttpServer } from "../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../util/context.util.js";
import { personaWebhookRoute } from "./routes/persona-kyc.route.js";
import { FastifyRequest } from "fastify";
import { PrincipalIssuer } from "../issuers/zcred/index.js";
import { ILogger } from "../backbone/logger.js";

type Dependencies = {
  logger: ILogger;
  httpServer: HttpServer;
  principalIssuer: PrincipalIssuer;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "principalIssuer",
  "logger"
];

export function personaKYCController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    principalIssuer
  } = contextUtil.from(tokens, injector);

  fastify.route({
    ...personaWebhookRoute,
    config: { rawBody: true },
    handler: async (req: FastifyRequest, resp) => {
      await principalIssuer.getIssuer("passport").handleWebhook?.(req);
      resp.statusCode = 200;
      return { message: "ok" };
    }
  });
}
