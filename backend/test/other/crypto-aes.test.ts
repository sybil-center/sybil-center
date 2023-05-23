import { suite } from "uvu";
import { hash } from "@stablelib/sha256";
import crypto from "node:crypto";
import * as a from "uvu/assert";
import { ethereumSupport } from "../support/chain/ethereum.js";

const test = suite("OTHER: AES node crypto test");

test("AES encript and decript", async () => {
  const alg = "aes-256-cbc";
  const { address } = ethereumSupport.info.ethereum;
  const message = `eth:${address}:secret`;
  const secret = "secret";
  const secretBytes = Array.from(secret, (i) => i.charCodeAt(0));
  const seed = hash((new Uint8Array(secretBytes)));
  const sha256 = crypto.createHash("sha256");
  sha256.update(new Uint8Array(secretBytes));
  const iv = Buffer.from(sha256.digest("hex").substring(32), "hex");

  const cipher = crypto.createCipheriv(alg, seed, iv);
  let encripted = cipher.update(message, "utf-8", "base64url");
  encripted += cipher.final("base64url");

  const decipher = crypto.createDecipheriv(alg, seed, iv);
  let decrypted = decipher.update(encripted, "base64url", "utf-8");
  decrypted += decipher.final("utf-8");
  a.is(decrypted, message);
});

test.run();
