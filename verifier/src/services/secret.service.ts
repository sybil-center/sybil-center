import { Config } from "../backbone/config.js";
import crypto from "node:crypto";
import * as u8a from "uint8arrays";
import { secp256k1 } from "@noble/curves/secp256k1";
import * as jose from "jose";
import { tokens } from "typed-inject";

export class SecretService {

  private readonly secret: string;

  static inject = tokens("config");
  constructor(
    config: Config
  ) {
    this.secret = config.secret;
  }

  async generateJWK(input: {
    secretPrefix: string;
    alg: "ES256K", kid: string
  }): Promise<{
    importedJWK: jose.KeyLike | Uint8Array,
    jwk: jose.JWK;
    publicJWK: jose.JWK;
  }> {
    const bytes = u8a.fromString(input.secretPrefix + this.secret);
    const privateKey = new Uint8Array(crypto.createHash("sha256")
      .update(bytes)
      .digest());
    if (input.alg === "ES256K") {
      const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1);
      const x = Buffer.from(publicKey.slice(0, 32)).toString("base64url");
      const y = Buffer.from(publicKey.slice(32)).toString("base64url");
      const d = Buffer.from(privateKey).toString("base64url");
      const importedJWK = await jose.importJWK({
        x, y, d, kty: "EC", crv: "secp256k1", kid: input.kid
      });
      const jwk = await jose.exportJWK(importedJWK);
      const publicJWK: jose.JWK = JSON.parse(JSON.stringify(jwk));
      delete publicJWK["d"];
      return { importedJWK, jwk, publicJWK };
    }
    throw new Error(`Can not generate JWK with input: ${JSON.stringify(input)}`);
  }

  generateSecret(input?: { secretPrefix: string }): Uint8Array {
    return Uint8Array.from(
      crypto.createHash("sha256")
        .update(input?.secretPrefix + this.secret)
        .digest()
    );
  }
}