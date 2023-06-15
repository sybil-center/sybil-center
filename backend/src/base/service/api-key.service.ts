import { tokens } from "typed-inject";
import { hash as sha256 } from "@stablelib/sha256";
import * as u8a from "uint8arrays";
import crypto from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { CredentialVerifier } from "./credential-verifivator.js";
import { ICaptchaService } from "./captcha.service.js";
import { credentialUtil } from "../../util/credential.utils.js";

/** Result of verifying key */
export type KeyVerifyResult = {
  /** It could be apiKey or secretKey */
  key: string;
  /** if true - secretKey, else apiKey */
  isSecret: boolean;
}

export type ApiKeyGenerate = {
  credential: EthAccountVC;
  captchaToken?: string;
}

/** Service for generating and validating API KEYS */
export class ApiKeyService {

  private readonly aes256cbc = "aes-256-cbc";
  private readonly apikeyPassword: Uint8Array;
  private readonly apikeyIV: Buffer;

  private readonly secretkeyPassword: Uint8Array;
  private readonly secretkeyIV: Buffer;

  static inject = tokens(
    "config",
    "credentialVerifier",
    "captchaService",
  );
  constructor(
    private readonly config: {
      secret: string,
      apiKeysCredentialTTL: number,
    },
    private readonly verifier: CredentialVerifier,
    private readonly captchaService: ICaptchaService
  ) {
    const secretBytes = u8a.fromString(this.config.secret, "utf-8");
    const forIV = u8a.fromString(`for iv: ${this.config.secret}`, "utf-8");
    this.apikeyPassword = sha256(secretBytes);
    this.secretkeyPassword = sha256(this.apikeyPassword);

    const apikeyHMAC = crypto.createHmac("sha256", this.apikeyPassword);
    apikeyHMAC.update(forIV);
    const secretkeyHMAC = crypto.createHmac("sha256", this.secretkeyPassword);
    secretkeyHMAC.update(forIV);

    this.apikeyIV = Buffer.from(apikeyHMAC.digest("hex").substring(0, 32), "hex");
    this.secretkeyIV = Buffer.from(secretkeyHMAC.digest("hex").substring(0, 32), "hex");
  }


  /**
   * Generate API keys
   * @param credential {@link EthAccountVC}
   * @param captchaToken If captchaToken is defined CAPTCHA
   *                     will be validated on the humanity
   */
  async generate({ credential, captchaToken }: ApiKeyGenerate): Promise<APIKeys> {
    this.#validateCredential(credential);
    if (captchaToken) await this.#validateCaptcha(captchaToken);
    const { isVerified } = await this.verifier.verify(credential);
    if (!isVerified) throw new ClientError("Credential is not verified");
    const { chainId, address } = credential.credentialSubject.ethereum;
    const accountId = `${chainId}:${address}`;
    const apikeySign = this.#signAES(accountId, "apikey");
    const secretkeySign = this.#signAES(accountId, "secretkey");
    return {
      apiKey: `ak_${apikeySign}`,
      secretKey: `sk_${secretkeySign}`
    };
  }

  /** Validates captcha if config.captchaRequired === true, else pass validation */
  async #validateCaptcha(captchaToken: string): Promise<void> {
    // set "auth" when invoke captcha request on frontend
    const isHumanResult = await this.captchaService.isHuman(captchaToken, "auth");
    if (!isHumanResult.isHuman) {
      throw new ClientError("Non human actions was detected")
    }
  }

  /** Validate credential properties before API KEYS generating */
  #validateCredential(credential: EthAccountVC) {
    const { valid, reason} = credentialUtil.validate(credential, {
      type: "EthereumAccount",
      reqExpDate: true,
      ttlRange: this.config.apiKeysCredentialTTL
    });
    if (!valid) throw new ClientError(reason!)
  }

  /** Verify API KEY, returns object with key and 'is secret' flag */
  async verify(key: string): Promise<KeyVerifyResult> {
    try {
      const kind = key.startsWith("ak_") ? "apikey" : "secretkey";
      const signature = key.substring(3);
      const originKey = this.#verifyAES(signature, kind);
      return {
        key: originKey,
        isSecret: kind === "secretkey"
      };
    } catch (e) {
      throw new ClientError("API key or secret key is not valid", 403);
    }
  }

  #signAES(msg: string, kind: "apikey" | "secretkey"): string {
    const password = kind === "apikey" ? this.apikeyPassword : this.secretkeyPassword;
    const iv = kind === "apikey" ? this.apikeyIV : this.secretkeyIV;
    const cipher = crypto.createCipheriv(this.aes256cbc, password, iv);

    let signature = cipher.update(msg, "utf-8", "base64url");
    signature += cipher.final("base64url");

    return signature;
  }

  #verifyAES(signature: string, kind: "apikey" | "secretkey") {
    const password = kind === "apikey" ? this.apikeyPassword : this.secretkeyPassword;
    const iv = kind === "apikey" ? this.apikeyIV : this.secretkeyIV;
    const decipher = crypto.createDecipheriv(this.aes256cbc, password, iv);
    let origin = decipher.update(signature, "base64url", "utf-8");
    origin += decipher.final("utf-8");
    return origin;
  }
}
