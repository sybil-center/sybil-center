import { tokens } from "typed-inject";
import * as u8a from "uint8arrays";
import { rest } from "../../util/fetch.util.js";
import * as t from "io-ts";
import { FastifyRequest } from "fastify";
import { createHash, createHmac } from "node:crypto";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientErr, ServerErr } from "../../backbone/errors.js";

type GetVerifyEntry = {
  reference: string;
  templateId?: string;
}

// @ts-expect-error
const EVENTS = [
  "request.pending",
  "request.invalid",
  "verification.cancelled",
  "request.timeout",
  "request.unauthorized",
  "verification.accepted",
  "verification.declined",
  "verification.status.changed",
  "request.deleted",
  "request.received",
  "review.pending"
] as const;

const GetVerifyURLResp = t.type({
  reference: t.string,
  event: t.string,
  verification_url: t.string
});

type GetVerifyURLResp = t.TypeOf<typeof GetVerifyURLResp>

const ShuftiResp = t.type({
  reference: t.string,
  event: t.string,
  verification_data: t.type({
    document: t.type({
      name: t.type({
        first_name: t.string,
        middle_name: t.union([t.string, t.null]),
        last_name: t.string,
      }),
      dob: t.string,
      issue_date: t.string,
      expiry_date: t.union([t.string, t.null]),
      document_number: t.string,
      gender: t.string,
      country: t.string,
      face_match_confidence: t.number,
    })
  })
});

type ShuftiResp = t.TypeOf<typeof ShuftiResp>

export type ShuftiWebhookResp = ShuftiResp & {
  verifyResult: "accepted" | "declined" | "cancelled"
}

export class ShuftiproKYC {

  private readonly clientId: string;
  private readonly secretKey: string;
  private readonly basicAuthorization: string;

  static inject = tokens("config");
  constructor(config: {
    shuftiproClientId: string;
    shuftiproSecretKey: string;
  }) {
    this.clientId = config.shuftiproClientId;
    this.secretKey = config.shuftiproSecretKey;
    this.basicAuthorization = u8a.toString(
      u8a.fromString(`${this.clientId}:${this.secretKey}`),
      "base64"
    );
  }

  createReference(data: string): string {
    return createHmac("sha256", this.secretKey)
      .update(data)
      .digest("base64url");
  }

  async getVerifyURL({ reference, templateId }: GetVerifyEntry): Promise<URL> {
    const resp = await rest.fetch(new URL("https://api.shuftipro.com"), {
      method: "POST",
      headers: {
        "Authorization": `Basic ${this.basicAuthorization}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reference: reference,
        journey_id: templateId
      })
    });
    const rawBody = await resp.text();
    console.log(rawBody);
    const headers = Object.fromEntries(resp.headers);
    this.checkHttp(headers, rawBody);
    const { verification_url } = ThrowDecoder
      .decode(GetVerifyURLResp, await resp.json(), new ServerErr({
        message: "Internal server error",
        place: `${this.constructor.name}.getVerifyURL`,
        description: `Can not decode body to object. Response body: ${rawBody}`
      }));
    return new URL(verification_url);
  }

  async handleWebhook(req: FastifyRequest): Promise<ShuftiWebhookResp> {
    await this.checkWebhook(req);
    const body = req.body;
    const result = ThrowDecoder.decode(
      ShuftiResp, body,
      new ClientErr(`Can not decode webhook body: ${req.body}`)
    );
    if (result.event === "verification.declined") return {
      ...result,
      verifyResult: "declined"
    };
    if (result.event === "verification.cancelled") return {
      ...result,
      verifyResult: "cancelled"
    };
    if (result.event === "verification.accepted") return {
      ...result,
      verifyResult: "accepted"
    };
    throw new ClientErr(`Event type ${result.event} is not prefered`);
  }

  async verifyWebhook({
    headers,
    rawBody
  }: FastifyRequest): Promise<boolean> {
    return this.verifyHttp(headers, rawBody);
  }

  async checkWebhook({
    headers,
    rawBody
  }: FastifyRequest): Promise<void> {
    this.checkHttp(headers, rawBody);
  }

  private verifyHttp(headers: Record<string, any>, body: string | Buffer | undefined): boolean {
    if (body === undefined) return false;
    const shuftiproSignature = (headers["Signature"]
      ? headers["Signature"]
      : headers["signature"]) as string;
    const hashedSecret = createHash("sha256")
      .update(this.secretKey)
      .digest("hex");
    const calculatedSignature = createHash("sha256")
      .update(body + hashedSecret)
      .digest("hex");
    return shuftiproSignature === calculatedSignature;
  }

  private checkHttp(headers: any, body: string | Buffer | undefined): never | void {
    if (!this.verifyHttp(headers, body)) {
      throw new ServerErr({
        message: "Internal server error",
        place: `${this.constructor.name}.checkHttp`,
        description: `Can not verify shuftipro http instance. Headers: ${JSON.stringify(headers)}, body: ${JSON.stringify(body)}`
      });
    }
  }
}
