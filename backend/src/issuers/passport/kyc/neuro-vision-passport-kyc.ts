import { IPassportKYCService, ProcedureArgs, ProcedureResp, WebhookResult } from "../types.js";
import { FastifyRequest } from "fastify";
import { Config } from "../../../backbone/config.js";
import crypto from "node:crypto";

export class NeuroVisionPassportKYC implements IPassportKYCService {

  constructor(
    private readonly config: Config
  ) {
  }

  createReference(clientKey: string): string {
    console.log(`CLIENT KEY:`, clientKey)
    return clientKey;
  }

  async initializeProcedure({ reference: clientKey }: ProcedureArgs): Promise<ProcedureResp> {
    const password = this.config.neuroVisionSecretKey; // <- Это "Secret key" из конфиги сценария
    const key = crypto.createHash("sha256")
      .update(password)
      .digest("hex")
      .substr(0, 32);
    let iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = Buffer.concat([
      iv,
      cipher.update(clientKey),
      cipher.final()
    ]).toString("base64");

    const verifyURL = new URL(`/issuers/passport/kyc/neuro-vision/start`, `${this.config.pathToExposeDomain}`);
    verifyURL.searchParams.set("schemaId", this.config.neuroVisionSchemaId);
    verifyURL.searchParams.set("clientKey", encrypted);

    return {
      verifyURL: verifyURL
    }
  }

  // @ts-expect-error
  handleWebhook(req: FastifyRequest): Promise<WebhookResult> {
    console.log(req.rawBody);
  };
}
