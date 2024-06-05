import { Injector } from "typed-inject";
import { HttpServer } from "../../../backbone/http-server.js";
import { IssuerSupervisor } from "../../issuer-supervisor.js";
import { contextUtil } from "../../../util/context.util.js";
import { ILogger } from "../../../backbone/logger.js";

type Dependencies = {
  httpServer: HttpServer;
  issuerSupervisor: IssuerSupervisor;
  logger: ILogger;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "issuerSupervisor",
  "logger",
];

export function NeuroVisionKYCPassportController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    issuerSupervisor
  } = contextUtil.from(tokens, injector);


  fastify.post("/issuers/passport/kyc/neuro-vision/webhook", {
    config: {
      rawBody: true
    }
  }, async (req, _) => {
    await issuerSupervisor.getIssuer("passport").handleWebhook!(req);
    return { message: "ok" };
  });

  fastify.get("/issuers/passport/kyc/neuro-vision/start", async (_, resp) => {
    await resp.sendFile("kyc/neuro-vision.html");
  });
}
