import * as jose from "jose";
import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { Config } from "../backbone/config.js";
import { tokens } from "typed-inject";
import { getDomain } from "../util/index.js";


type VerifyJWSOptions = {
  statement: string;
}

export const Es256kJwk = Type.Object({
  x: Type.String(),
  y: Type.String(),
  crv: Type.Enum({ secp256k1: "secp256k1" }),
  kty: Type.Enum({ ES: "EC" })
}, {additionalProperties: true});


export type Es256kJwk = Static<typeof Es256kJwk>;

export const ZcredJwsPayload = Type.Object({
  iat: Type.Optional(Type.Number()),
  exp: Type.Number(),
  aud: Type.String(),
  statement: Type.Optional(Type.String()),
  jwk: Es256kJwk
}, {additionalProperties: true});

export type ZcredJwsPayload = Static<typeof ZcredJwsPayload>;


export class JwsVerifierService {

  static inject = tokens("config");
  constructor(
    private readonly config: Config
  ) {}

  /**
   * Verify JWS. Now support only ES256K1
   * JWS payload MUST be {@link ZcredJwsPayload}
   * @param jws
   * @param options
   */
  async verifyJWS(jws: string, options?: VerifyJWSOptions): Promise<ZcredJwsPayload> {
    const decodedPayload = jose.decodeJwt<ZcredJwsPayload>(jws);
    if (!Value.Check(ZcredJwsPayload, decodedPayload)) {
      throw new Error("Invalid JWS payload");
    }
    if (options?.statement && options.statement !== decodedPayload.statement) {
      throw new Error(`Expected JWS payload statement: ${options.statement}`);
    }
    const expDate = new Date(decodedPayload.exp);
    if (expDate.getTime() < new Date().getTime()) {
      throw new Error(`JWS is expired`);
    }
    const actualDomain = getDomain(this.config.exposeDomain);
    const expectedDomain = getDomain(decodedPayload.aud);
    if (expectedDomain !== actualDomain) {
      throw new Error(`Invalid "aud" jws payload. Value must be ${this.config.exposeDomain}`);
    }
    const jwk = await jose.importJWK(decodedPayload.jwk);
    await jose.compactVerify(jws, jwk);
    return decodedPayload;
  }
}