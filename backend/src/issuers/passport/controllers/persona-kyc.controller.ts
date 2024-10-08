import { HttpServer } from "../../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { contextUtil } from "../../../util/context.util.js";
import { FastifyRequest } from "fastify";
import { ILogger } from "../../../backbone/logger.js";
import { IssuerSupervisor } from "../../issuer-supervisor.js";

export const personaWebhookEP = "/api/v1/kyc/callback";

type Dependencies = {
  logger: ILogger;
  httpServer: HttpServer;
  issuerSupervisor: IssuerSupervisor;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "issuerSupervisor",
  "logger"
];

export function PersonaKYCController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    issuerSupervisor
  } = contextUtil.from(tokens, injector);

  fastify.route({
    method: ["POST"],
    url: personaWebhookEP,
    schema: {
      headers: {
        type: "object",
        required: [
          "Persona-Signature"
        ],
        properties: {
          "Persona-Signature": {
            type: "string"
          }
        }
      }
    },
    config: { rawBody: true },
    handler: async (req: FastifyRequest, resp) => {
      await issuerSupervisor.getIssuer("passport").handleWebhook?.(req);
      resp.statusCode = 200;
      return { message: "ok" };
    }
  });
}
