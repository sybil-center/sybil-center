import { secp256k1 } from "@noble/curves/secp256k1";
import crypto from "node:crypto";
import * as jose from "jose";
import { Es256kJwk, ZcredJwsPayload } from "../../src/services/jws.verifier.service.js";

const privateKey = crypto.createHash("sha256")
  .update("secret")
  .digest();

const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1);

const x = Buffer.from(publicKey.slice(0, 32)).toString("base64url");
const y = Buffer.from(publicKey.slice(32)).toString("base64url");
const d = Buffer.from(privateKey).toString("base64url");

export async function createClientJWS(input: {
  statement: string;
  origin: string;
}): Promise<string> {
  const jwk: Es256kJwk = {
    x, y, kty: "EC", crv: "secp256k1"
  };
  const importedJWK = await jose.importJWK({
    ...jwk,
    d: d
  });
  return new jose.CompactSign(
    new TextEncoder().encode(JSON.stringify({
      exp: new Date(new Date().getTime() + 1000 * 10 * 60).getTime(),
      aud: input.origin,
      statement: input.statement,
      jwk: jwk
    } satisfies ZcredJwsPayload))
  ).setProtectedHeader({ alg: "ES256K" })
    .sign(importedJWK);
}
