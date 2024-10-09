import { Injector } from "typed-inject";
import { HttpServer } from "../../../backbone/http-server.js";
import { IssuerSupervisor } from "../../issuer-supervisor.js";
import { contextUtil } from "../../../util/context.util.js";
import { ILogger } from "../../../backbone/logger.js";
import { PassportIssuer } from "../issuer.js";
import { NeuroVisionPassportKYC } from "../kyc/neuro-vision-passport-kyc.js";

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

  fastify.get<{
    Params: { publicId: string }
  }>("/issuer/passport/kyc/neuro-vision/is-verified/:publicId", {
    schema: {
      params: {
        type: "object",
        required: ["publicId"],
        properties: {
          publicId: { type: "string" }
        }
      }
    }
  }, async (req, resp) => {
    const publicId = req.params.publicId;
    const passportIssuer = issuerSupervisor.getIssuer("passport") as PassportIssuer;
    const neuroVisionKyc = passportIssuer.passportKYC;
    if (!("getStatus" in neuroVisionKyc) || typeof neuroVisionKyc.getStatus !== "function") {
      resp.statusCode = 500;
      return { message: `Expect NeuroVisionKYC.getStatus function` };
    }
    const result = await (<NeuroVisionPassportKYC>neuroVisionKyc).getStatus(publicId);
    if (!result) {
      resp.statusCode = 400;
      return { message: `Session not found by publicId: ${publicId}` };
    }
    return {
      status: result.status,
      redirectURL: result.redirectURL
    };
  });
}
