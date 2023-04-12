import { tokens } from "typed-inject";
import { hash } from "@stablelib/sha256";
import * as u8a from "uint8arrays";
import crypto from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { CredentialVerifier } from "./credential-verifivator.js";

/** Result of verifying key */
export type KeyVerifyResult = {
  /** It could be apiKey or secretKey */
  key: string;
  /** if true - secretKey, else apiKey */
  isSecret: boolean;
}

export class ApiKeyService {

  private readonly aes256cbc = "aes-256-cbc";
  private readonly password: Uint8Array;
  private readonly iv: Buffer;

  static inject = tokens(
    "config",
    "credentialVerifier"
  );
  constructor(
    config: { secret: string },
    private readonly verifier: CredentialVerifier
  ) {
    const secretBytes = u8a.fromString(config.secret, "utf-8");
    const forIV = u8a.fromString(`for iv: ${config.secret}`, "utf-8");
    this.password = hash(secretBytes);
    this.iv = Buffer.from(u8a.toString(hash(forIV),"hex").substring(0, 32), "hex");
  }

  async generate(credential: EthAccountVC): Promise<APIKeys> {
    const { isVerified } = await this.verifier.verify(credential);
    if (!isVerified) throw new ClientError("Credential is not verified");
    const { chainId, address } = credential.credentialSubject.ethereum;
    const forApiKey = `${chainId}:${address}`;
    const forSecret = `${forApiKey}:secret`;
    const apiKey = this.#signAES(forApiKey);
    const secretKey = this.#signAES(forSecret);
    return {
      apiKey: apiKey,
      secretKey: secretKey
    };
  }

  async verify(key: string): Promise<KeyVerifyResult> {
    try {
      const originKey = this.#verifyAES(key);
      const isSecret = originKey.split(":")[3];
      return {
        key: originKey,
        isSecret: Boolean(isSecret)
      };
    } catch (e) {
      throw new ClientError("API key or secret key is not valid");
    }
  }

  #signAES(msg: string): string {
    const cipher = crypto.createCipheriv(this.aes256cbc, this.password, this.iv);
    let signature = cipher.update(msg, "utf-8", "base64url");
    signature += cipher.final("base64url");
    return signature;
  }

  #verifyAES(signature: string) {
    const decipher = crypto.createDecipheriv(this.aes256cbc, this.password, this.iv);
    let origin = decipher.update(signature, "base64url", "utf-8");
    origin += decipher.final("utf-8");
    return origin;
  }
}
