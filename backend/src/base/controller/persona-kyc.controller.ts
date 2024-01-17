import { HttpServer } from "../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../util/context.util.js";
import { personaWebhookRoute } from "./routes/persona-kyc.route.js";
import { FastifyRequest } from "fastify";
import { ZKCIssuerManager } from "../../issuers/zkc/zkc-issuer.manager.js";
import { PrincipalIssuer } from "../../issuers/zcred/index.js";
import { ILogger } from "../../backbone/logger.js";

type Dependencies = {
  logger: ILogger;
  httpServer: HttpServer;
  zkcIssuerManager: ZKCIssuerManager;
  principalIssuer: PrincipalIssuer;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "zkcIssuerManager",
  "principalIssuer",
  "logger"
];

export function personaKYCController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    principalIssuer,
    zkcIssuerManager,
    logger
  } = contextUtil.from(tokens, injector);

  fastify.route({
    ...personaWebhookRoute,
    config: { rawBody: true },
    handler: async (req: FastifyRequest, resp) => {
      // TODO: Change it
      let errorsCount = 0;
      try {
        await zkcIssuerManager.handleWebhook("passport", req);
      } catch (e) {
        logger.info(e);
        errorsCount++;
      }
      try {
        await principalIssuer.getIssuer("passport-test").handleWebhook?.(req);
      } catch (e) {
        logger.info(e);
        errorsCount++;
      }
      if (errorsCount === 2) {
        resp.statusCode = 400;
        return { message: "bad request" };
      }
      resp.statusCode = 200;
      return { message: "ok" };
    }
  });
}
