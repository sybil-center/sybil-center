import { tokens } from "typed-inject";
import { hash as sha256 } from "@stablelib/sha256";
import * as u8a from "uint8arrays";
import crypto from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { CredentialVerifier } from "./credential-verifivator.js";
import { credentialUtil } from "../../util/credential.utils.js";
import { ApikeyEntity, IApikeyRepo } from "../storage/apikey.repo.js";
import { random } from "../../util/random.util.js";
import { Credential } from "../types/credential.js";

/** Result of verifying key */
export type KeyVerifyResult = {
  accountId: string;
  /** It could be apiKey or secretKey */
  originKey: string;
  /** if true - secretKey, else apiKey */
  isSecret: boolean;
}

export type ApikeyRequire = {
  credential: Credential
}

export type ApikeysUpdate = {
  onlySecret?: boolean;
  refresh?: boolean;

}

export interface Apikeys extends APIKeys {
  onlySecret?: boolean;
  reqCount: number;
}

/** Service for generating and validating API KEYS */
export class ApikeyService {

  private readonly aes256cbc = "aes-256-cbc";
  private readonly apikeyPassword: Uint8Array;
  private readonly apikeyIV: Buffer;

  private readonly secretkeyPassword: Uint8Array;
  private readonly secretkeyIV: Buffer;

  static inject = tokens(
    "config",
    "credentialVerifier",
    "apikeyRepo"
  );
  constructor(
    private readonly config: {
      secret: string,
      apiKeysCredentialTTL: number,
    },
    private readonly verifier: CredentialVerifier,
    private readonly apikeyRepo: IApikeyRepo
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

  private toAPIkeys(input: {
    accountId: string;
    secretSalt?: string;
    apikeySalt?: string
  }): APIKeys {
    const apikey = input.apikeySalt
      ? `${input.accountId}:${input.apikeySalt}`
      : input.accountId;
    const secret = input.secretSalt
      ? `${input.accountId}:${input.secretSalt}`
      : input.accountId;
    const apikeySing = this.#signAES(apikey, "apikey");
    const secretSing = this.#signAES(secret, "secretkey");
    return {
      apiKey: `ak_${apikeySing}`,
      secretKey: `sk_${secretSing}`,
    };
  }

  private async create(
    { accountId }: { accountId: string },
  ): Promise<Apikeys> {
    const created = await this.apikeyRepo.create({
      accountId: accountId,
      reqCount: 0
    });
    const { apiKey, secretKey } = await this.toAPIkeys(created);
    return {
      apiKey: apiKey,
      secretKey: secretKey,
      reqCount: created.reqCount,
      onlySecret: created.onlySecret
    };
  }

  async findOrCreate(
    { accountId }: { accountId: string },
  ): Promise<Apikeys> {
    const found = await this.apikeyRepo.find({ accountId });
    if (!found) return this.create({ accountId });
    const { apiKey, secretKey } = this.toAPIkeys(found);
    return {
      apiKey: apiKey,
      secretKey: secretKey,
      reqCount: found.reqCount,
      onlySecret: found.onlySecret
    };
  }

  async update(
    { accountId }: { accountId: string },
    { onlySecret, refresh }: ApikeysUpdate,
  ): Promise<Apikeys> {
    const apikeySalt = refresh ? random.string(27) : undefined;
    const secretSalt = refresh ? random.string(27) : undefined;
    const created = await this.apikeyRepo.update({ accountId }, {
      apikeySalt: apikeySalt,
      secretSalt: secretSalt,
      onlySecret: onlySecret
    });
    const { apiKey, secretKey } = this.toAPIkeys(created);
    return {
      apiKey: apiKey,
      secretKey: secretKey,
      reqCount: created.reqCount,
      onlySecret: created.onlySecret
    };
  }

  async verifyKey(key: string, checkOnlySecret?: boolean): Promise<KeyVerifyResult> {
    const kind = key.startsWith("ak_") ? "apikey" : "secretkey";
    const isSecret = kind === "secretkey";
    const signature = key.substring(3);
    const originKey = this.#verifyAES(signature, kind);
    const [chainIdPre, chainIdPost, address, salt] = originKey.split(":");
    const accountId = [chainIdPre, chainIdPost, address].join(":");
    const found = await this.apikeyRepo.find({ accountId });
    if (!found) {
      const created = await this.apikeyRepo.create({ accountId, reqCount: 0 });
      return {
        accountId: created.accountId,
        originKey: originKey,
        isSecret: isSecret
      };
    }
    const targetSalt = kind === "apikey" ? found.apikeySalt : found.secretSalt;
    if (salt !== targetSalt) throw new ClientError(`Invalid ${kind}`);
    if (checkOnlySecret && found.onlySecret && !isSecret) {
      throw new ClientError(`Only secret apikey required`);
    }
    return {
      accountId: accountId,
      originKey: originKey,
      isSecret: isSecret
    };
  }

  async handleKey(key: string, checkOnlySecret?: boolean): Promise<ApikeyEntity> {
    const { accountId } = await this.verifyKey(key, checkOnlySecret);
    const { reqCount } = await this.apikeyRepo.get({ accountId });
    return await this.apikeyRepo.update(
      { accountId },
      { reqCount: reqCount + 1 }
    );
  }

  /** Validate credential properties before API KEYS generating */
  private validateCredential(credential: Credential): credential is EthAccountVC {
    const { valid, reason } = credentialUtil.validate(credential, {
      type: "EthereumAccount"
    });
    if (!valid) throw new ClientError(reason!);
    return true;
  }

  /**
   * @deprecated use {@link #update} instead
   * Generate API keys
   * @param credential {@link EthAccountVC}
   * @param captchaToken If captchaToken is defined CAPTCHA
   *                     will be validated on the humanity
   */
  async generate(credential: Credential): Promise<APIKeys> {
    const validated = this.validateCredential(credential);
    if (!validated) throw new ClientError("Invalid credential");
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

  /**
   *  @deprecated use {@link #verifyKey} instead
   *  Verify API KEY, returns object with key and 'is secret' flag
   */
  async verify(key: string): Promise<KeyVerifyResult> {
    try {
      const kind = key.startsWith("ak_") ? "apikey" : "secretkey";
      const signature = key.substring(3);
      const originKey = this.#verifyAES(signature, kind);
      const [chainId, address] = originKey.split(":");
      const accountId = `${chainId}:${address}`;
      return {
        accountId: accountId,
        originKey: originKey,
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

  #verifyAES(signature: string, kind: "apikey" | "secretkey"): string {
    try {
      const password = kind === "apikey" ? this.apikeyPassword : this.secretkeyPassword;
      const iv = kind === "apikey" ? this.apikeyIV : this.secretkeyIV;
      const decipher = crypto.createDecipheriv(this.aes256cbc, password, iv);
      let origin = decipher.update(signature, "base64url", "utf-8");
      origin += decipher.final("utf-8");
      return origin;
    } catch (e) {
      throw new ClientError(`Invalid ${kind}`);
    }
  }
}
