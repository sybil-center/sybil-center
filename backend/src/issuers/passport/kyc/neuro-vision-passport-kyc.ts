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
    console.log(`CLIENT KEY:`, clientKey);
    return clientKey;
  }

  async initializeProcedure({ reference: clientKey }: ProcedureArgs): Promise<ProcedureResp> {
    console.log(`CLIENT KEY: ${clientKey}`);
    const password = this.config.neuroVisionSecretKey; // <- Это "Secret key" из конфиги сценария
    console.log(`SECRET KEY: ${password}`);
    const key = crypto.createHash("sha256")
      .update(password)
      .digest("hex")
      .substr(0, 32);
    console.log(`HASH SECRET KEY: ${key}`);
    const iv = crypto.randomBytes(16);
    console.log(`IV as base64`, iv.toString("base64"));
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([
      iv,
      cipher.update(clientKey),
      cipher.final()
    ]).toString("base64");
    console.log(`ENCRYPTED: ${encrypted}`);
    const verifyURL = new URL(`/issuers/passport/kyc/neuro-vision/start`, `${this.config.pathToExposeDomain}`);
    verifyURL.searchParams.set("schemaId", this.config.neuroVisionSchemaId);
    verifyURL.searchParams.set("clientKey", encrypted);

    return {
      verifyURL: verifyURL
    };
  }

  // @ts-expect-error
  handleWebhook(req: FastifyRequest): Promise<WebhookResult> {
    console.log(req.rawBody);
  };
}
