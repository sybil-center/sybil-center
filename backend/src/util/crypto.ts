import crypto from "node:crypto"

export function sha256Hmac(input: {
  secret: string | Uint8Array;
  data: string | Uint8Array;
}) {
  return crypto.createHmac("sha256", input.secret)
    .update(input.data)
}
