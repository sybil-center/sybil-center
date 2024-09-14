import { IPassportKYCService, ProcedureArgs, ProcedureResp, WebhookResult, WebhookResultOK } from "../types.js";
import { FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { ClientErr } from "../../../backbone/errors.js";
import { Gender } from "../../../services/sybiljs/passport/types.js";
import { parse as mrzParse } from "mrz";
import { sha256Hmac } from "../../../util/crypto.js";
import { Config } from "../../../backbone/config.js";
import Keyv from "@keyvhq/core";

type WebhookBody = {
  clientId: string;
  createdAt: string;
  results: {
    status: string;
    type: string;
    spent: number;
    errors: [];
    tries: number;
    docName: string;
    checks: [];
    ocr: {
      status: string;
      fields: [
        {
          title: string;
          value: string;
        }
      ]
    }
  }[];
  sessionId: string;
  spent: number;
  status: string;
  clientKey: string;
  schemaId: string;
}

function isWebhookBody(body: unknown): body is WebhookBody {
  return (
    typeof body === "object" && body !== null &&
    "clientId" in body && typeof body.clientId === "string" &&
    "createdAt" in body && typeof body.createdAt === "string" &&
    "results" in body && Array.isArray(body.results) &&
    !(body.results.find((it) => !isWebhookBodyResult(it))) &&
    "sessionId" in body && typeof body.sessionId === "string" &&
    "spent" in body && typeof body.spent === "number" &&
    "status" in body && typeof body.status === "string" &&
    "clientKey" in body && typeof body.clientKey === "string" &&
    "schemaId" in body && typeof body.schemaId === "string"
  );
}

function isWebhookBodyResult(o: unknown): o is WebhookBody["results"][number] {
  return (
    typeof o === "object" && o !== null &&
    "status" in o && typeof o.status === "string" &&
    "type" in o && typeof o.type === "string" &&
    "spent" in o && typeof o.spent === "number" &&
    "errors" in o && Array.isArray(o.errors) &&
    "tries" in o && typeof o.tries === "number" &&
    "docName" in o && typeof o.docName === "string" &&
    "checks" in o && Array.isArray(o.checks) &&
    "ocr" in o && typeof o.ocr === "object" && o.ocr !== null &&
    "status" in o.ocr && typeof o.ocr.status === "string" &&
    "fields" in o.ocr && Array.isArray(o.ocr.fields) &&
    !(o.ocr.fields.find(it => !isNVField(it)))
  );
}

function isNVField(o: unknown): o is WebhookBody["results"][number]["ocr"]["fields"][number] {
  return (
    typeof o === "object" && o !== null &&
    "title" in o && typeof o.title === "string" &&
    "value" in o && typeof o.value === "string"
  );
}

type Session = {
  id: string;
  status: "success" | "failed" | "wait"
}

/** Only for Foreign Passports */
export class NeuroVisionPassportKYC implements IPassportKYCService {

  private readonly sessionIdMap: Keyv<Session>;

  constructor(
    private readonly config: Config,
    private readonly toSessionId: (clientKey: string) => string
  ) {
    this.sessionIdMap = new Keyv({ ttl: config.kycSessionTtl });
  }

  createReference(clientKey: string): string {
    return clientKey;
  }

  async initializeProcedure({ reference: clientKey }: ProcedureArgs): Promise<ProcedureResp> {
    const password = this.config.neuroVisionSecretKey; // <- Это "Secret key" из конфиги сценария
    const key = crypto.createHash("sha256")
      .update(password)
      .digest("hex")
      .substr(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const sessionId = this.toSessionId(clientKey);
    const publicId = this.createPublicId(sessionId);
    console.log(`INIT CLIENT KEY: ${clientKey}`);
    await this.sessionIdMap.set(publicId, { id: sessionId, status: "wait" });
    const encrypted = Buffer.concat([
      iv,
      cipher.update(clientKey),
      cipher.final()
    ]).toString("base64");
    const verifyURL = new URL(`/issuers/passport/kyc/neuro-vision/start`, `${this.config.pathToExposeDomain}`);
    verifyURL.searchParams.set("schemaId", this.config.neuroVisionSchemaId);
    verifyURL.searchParams.set("clientKey", encrypted);
    const statusURL = new URL(`/issuer/passport/kyc/neuro-vision/is-verified/${publicId}`, this.config.pathToExposeDomain);
    verifyURL.searchParams.set("statusURL", statusURL.href);

    return {
      verifyURL: verifyURL
    };
  }

  private createPublicId(sessionId: string) {
    return sha256Hmac({
      secret: "neuro-vision-kyc-secret:" + this.config.secret,
      data: sessionId
    }).digest("base64url");
  }


  async handleWebhook(req: FastifyRequest): Promise<WebhookResult> {
    const body = req.body;
    if (!isWebhookBody(body)) throw new ClientErr({
      statusCode: 400,
      message: `Neuro-vision webhook body is not correct. Body: ${JSON.stringify(body, null, 2)}`,
      place: `${this.constructor.name}.handleWebhook`
    });
    const passportData = extractPassportData(body);
    const sessionId = this.toSessionId(body.clientKey);
    const publicId = this.createPublicId(sessionId);
    if (!isPassportDataOK(passportData)) {
      await this.sessionIdMap.set(publicId, { id: sessionId, status: "failed" });
      return { verified: false, reference: body.clientKey };
    }
    const { result, fields } = passportData;
    const verified = body.status === "success"
      && result.status === "success"
      && result.ocr.status === "success";
    const { passport } = toPassportFormat(fields);
    await this.sessionIdMap.set(publicId, { id: sessionId, status: "success" });
    console.log(`WEBHOOK CLIENT KEY: ${body.clientKey}`);
    console.log(`IS VERIFIED: ${verified}`);
    return {
      verified,
      reference: body.clientKey,
      passport: passport
    } satisfies WebhookResultOK;
  };

  async getStatus(publicId: string) {
    const session = await this.sessionIdMap.get(publicId);
    if (session) return session;
    throw new Error(`Public session not found ${publicId}`);
  }

  async dispose() {
    this.sessionIdMap.clear();
  }
}

type RawFields = {
  validUntil: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "male" | "female" | "nonspecified";
  docId: string;
  countryCode: string;
}

type PassportData = {
  result?: WebhookBody["results"][number];
  fields?: RawFields,
  isVerified: boolean
}

type PassportDateOK = Required<PassportData> & { isVerified: true }

function isPassportDataOK(o: PassportData): o is PassportDateOK {
  return o.isVerified;
}

function extractPassportData(body: WebhookBody): PassportData {
  for (const result of body.results) {
    const fields = result.ocr.fields;
    const mrzStringField = getMRZStringField(fields);
    if (mrzStringField) {
      const split = mrzStringField.value.split("^");
      const mrzParseInput = split.length === 1
        ? mrzStringField.value.split(" ")
        : split;
      const {
        fields: {
          firstName,
          lastName,
          sex, // male // female // nonspecified
          expirationDate,
          documentNumber,
          issuingState,
          birthDate
        }
      } = mrzParse(mrzParseInput);
      if (firstName && lastName && sex && expirationDate && documentNumber && issuingState && birthDate) {
        return {
          isVerified: true,
          result: result,
          fields: {
            firstName: firstName,
            lastName: lastName,
            gender: sex as "male" | "female" | "nonspecified",
            birthDate: birthDate,
            docId: documentNumber,
            countryCode: issuingState,
            validUntil: expirationDate
          }
        };
      }
    }
  }
  return { isVerified: false };
}

function getMRZStringField(
  fields: WebhookBody["results"][number]["ocr"]["fields"]
): WebhookBody["results"][number]["ocr"]["fields"][number] | null {
  for (const field of fields) {
    if (field.title === "MRZStrings") return field;
  }
  return null;
}

const sexMap = new Map<string, Gender>([
  ["male", "male"],
  ["female", "female"],
  ["nonspecified", "other"]
]);

function toPassportFormat(fields: RawFields): Omit<WebhookResultOK, "verified" | "reference"> {
  const now = new Date();
  const currentYear = Number(now.getUTCFullYear().toString().slice(2, 4));
  const currentCentury = Number(now.getUTCFullYear().toString().slice(0, 2)) + 1;
  const validFrom = new Date().toISOString();
  const vuYear = Number(`20${fields.validUntil.slice(0, 2)}`);
  const vuMonth = Number(fields.validUntil.slice(2, 4));
  const vuDay = Number(fields.validUntil.slice(4, 6));
  const firstName = fields.firstName;
  const lastName = fields.lastName;

  const bdYaer = Number(Number(fields.birthDate.slice(0, 2)) > currentYear
    ? `${(currentCentury - 2).toString()}${fields.birthDate.slice(0, 2)}`
    : `${(currentCentury - 1).toString()}${fields.birthDate.slice(0, 2)}`
  ).toString();
  const bdMonth = Number(fields.birthDate.slice(2, 4));
  const bdDay = Number(fields.birthDate.slice(4, 6));

  const gender = sexMap.get(fields.gender);
  if (!gender) throw new ClientErr({
    message: `Unsupported gender`,
    place: `Neuro-Vision KYC transformRawFields`,
    description: `Unsupported gender: ${fields.gender}`
  });
  const countryCode = fields.countryCode;
  return {
    passport: {
      validFrom,
      validUntil: `${vuYear}-${vuMonth < 10 ? `0` + vuMonth : vuMonth}-${vuDay < 10 ? `0` + vuDay : vuDay}T00:00:00.000Z`,
      subject: {
        firstName,
        lastName,
        birthDate: `${bdYaer}-${bdMonth < 10 ? `0` + bdMonth : bdMonth}-${bdDay < 10 ? `0` + bdDay : bdDay}T00:00:00.000Z`,
        gender
      },
      countryCode,
      document: { id: fields.docId }
    }
  };
}
