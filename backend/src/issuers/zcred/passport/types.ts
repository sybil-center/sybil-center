import { FastifyRequest } from "fastify";
import { Gender } from "../../../services/sybiljs/passport/types.js";

export type ProcedureArgs = {
  reference: string;
}

export type ProcedureResp = {
  verifyURL: URL
}

export type WebhookResult = {
  verified: boolean;
  reference: string;
  passport: {
    /** ISO date-time */
    validFrom: string;
    /** ISO date-time */
    validUntil: string;
    subject: {
      firstName: string;
      lastName: string;
      birthDate: string;
      gender: Gender
    }
    countryCode: string;
    document: { id: string }
  }
}

export interface IPassportKYCService {
  createReference(str: string): string;
  initializeProcedure(args: ProcedureArgs): Promise<ProcedureResp>;
  handleWebhook(req: FastifyRequest): Promise<WebhookResult>;
}
