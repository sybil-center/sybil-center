import { IPassportKYCService, ProcedureArgs, ProcedureResp, WebhookResult } from "../types.js";
import { Config } from "../../../backbone/config.js";
import crypto from "node:crypto";
import { FastifyRequest } from "fastify";
import { ClientErr } from "../../../backbone/errors.js";

type Session = {
  id: string;
  status: "wait" | "success" | "failed";
  redirectURL: string;
}

export class StubPassportKYC implements IPassportKYCService {

  private readonly session: Record<string, Session> = {};

  constructor(
    private readonly config: Config
  ) {}

  createReference(str: string): string {
    return crypto.createHmac("sha256", this.config.secret)
      .update(str)
      .digest("base64url");
  }

  async initializeProcedure({ reference, redirectURL }: ProcedureArgs): Promise<ProcedureResp> {
    const url = new URL("https://api.dev.sybil.center/api/v1/stub-kyc/verification");
    url.searchParams.set("reference", reference);
    this.session[reference] = {
      id: reference,
      status: "wait",
      redirectURL: redirectURL
    };
    return { verifyURL: url };
  }

  async getStatus(reference: string): Promise<Session> {
    const session = this.session[reference];
    if (!session) {
      throw new ClientErr(`Session not found by sessionId: ${reference}`);
    }
    return session;
  }


  async handleWebhook(req: FastifyRequest<{ Querystring: { reference?: string } }>): Promise<WebhookResult> {
    const reference = req.query.reference;
    if (!reference) throw new ClientErr({
      message: "Bad request. KYC webhook must contains reference as querystring parameter",
      place: this.constructor.name,
      description: `Passport KYC STUB bad request, URL: ${req.url}`
    });
    const session = this.session[reference];
    if (!session) {
      throw new ClientErr(`Session not found, reference ${reference}`);
    }
    this.session[reference] = { ...session, status: "success" };
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

  async dispose(): Promise<void> {}

}
