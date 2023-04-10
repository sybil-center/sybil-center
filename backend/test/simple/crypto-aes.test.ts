import { suite } from "uvu";
import { hash } from "@stablelib/sha256";
import crypto from "node:crypto";
import * as a from "uvu/assert";
import { ethereumSupport } from "../test-support/chain/ethereum.js";

const test = suite("AES node crypto test");

test("AES encript and decript", async () => {
  const alg = "aes-256-cbc";
  const { address } = ethereumSupport.info.ethereum;
  const message = `eth:${address}:secret`;
  const secret = "secret";
  const secretBytes = Array.from(secret, (i) => i.charCodeAt(0));
  const seed = hash((new Uint8Array(secretBytes)));
  const hash128 = crypto.createHash("sha256");
  hash128.update(new Uint8Array(secretBytes));
  hash128
  const iv = Buffer.from(hash128.digest("hex").substring(32), "hex");

  const cipher = crypto.createCipheriv(alg, seed, iv);
  let encripted = cipher.update(message, "utf-8", "base64url");
  encripted += cipher.final("base64url");
  console.log(encripted);

  const decipher = crypto.createDecipheriv(alg, seed, iv);
  let decripted = decipher.update(encripted, "base64url", "utf-8");
  decripted += decipher.final("utf-8");
  console.log("Decrypted message: " + decripted);
  console.log(message.split(":")[2])
  a.is(decripted, message);
});

test.run();
