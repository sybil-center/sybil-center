import { FastifyRequest } from "fastify";
import { Gender, isGender } from "../../services/sybiljs/passport/types.js";

export type ProcedureArgs = {
  reference: string;
}

export type ProcedureResp = {
  verifyURL: URL
}

export type WebhookResult = {
  /** if false then "passport" undefined */
  verified: boolean;
  reference: string;
  passport?: {
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
    /** 3 Alphabet ISO 3166 country code */
    countryCode: string;
    document: { id: string }
  }
}

export type WebhookResultOK = Required<WebhookResult>

export function isWebhookResultOK(o: WebhookResult): o is WebhookResultOK {
  return (
    o.verified && "passport" in o && typeof o.passport === "object" && o.passport !== null &&
    isPassport(o.passport)
  );
}

function isPassport(o: unknown): o is WebhookResultOK["passport"] {
  return (
    typeof o === "object" && o !== null &&
    "validFrom" in o && typeof o.validFrom === "string" &&
    "validUntil" in o && typeof o.validUntil == "string" &&
    "subject" in o && typeof o.subject === "object" && o.subject !== null &&
    "firstName" in o.subject && typeof o.subject.firstName === "string" &&
    "lastName" in o.subject && typeof o.subject.lastName === "string" &&
    "birthDate" in o.subject && typeof o.subject.birthDate === "string" &&
    "gender" in o.subject && typeof o.subject.gender === "string" && isGender(o.subject.gender) &&
    "countryCode" in o && typeof o.countryCode === "string" &&
    "document" in o && typeof o.document === "object" && o.document !== null &&
    "id" in o.document && typeof o.document.id === "string"
  );
}

export interface IPassportKYCService {
  createReference(str: string): string;
  initializeProcedure(args: ProcedureArgs): Promise<ProcedureResp>;
  handleWebhook(req: FastifyRequest): Promise<WebhookResult>;
}
