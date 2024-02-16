import { IPassportKYCService, ProcedureArgs, ProcedureResp, WebhookResult } from "../types.js";
import { Config } from "../../../../backbone/config.js";
import crypto from "node:crypto";
import { FastifyRequest } from "fastify";
import { ClientErr } from "../../../../backbone/errors.js";

export class StubPassportKYC implements IPassportKYCService {

  constructor(
    private readonly config: Config
  ) {}

  createReference(str: string): string {
    return crypto.createHmac("sha256", this.config.secret)
      .update(str)
      .digest("base64url");
  }

  async initializeProcedure({ reference }: ProcedureArgs): Promise<ProcedureResp> {
    const url = new URL("https://api.dev.sybil.center/api/v1/stub-kyc/verification");
    url.searchParams.set("reference", reference);
    return { verifyURL: url };
  }


  async handleWebhook(req: FastifyRequest<{ Querystring: { reference?: string } }>): Promise<WebhookResult> {
    const reference = req.query.reference;
    if (!reference) throw new ClientErr({
      message: "Bad request. KYC webhook must contains reference as querystring parameter",
      place: this.constructor.name,
      description: `Passport KYC STUB bad request, URL: ${req.url}`
    });
    return {
      passport: {
        validFrom: new Date(2015, 0, 1).toISOString(),
        validUntil: new Date(2030, 0, 1).toISOString(),
        subject: {
          firstName: "John",
          lastName: "Smith",
          birthDate: new Date(1995, 0, 1).toISOString(),
          gender: "male"
        },
        countryCode: "GBR",
        document: {
          id: "test-passport:123456"
        }
      },
      reference: reference,
      verified: true
    };
  }

}
