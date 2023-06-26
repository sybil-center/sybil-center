import { EthAccountVC } from "@sybil-center/sdk";
import { tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";
import { credentialUtil } from "../../util/credential.utils.js";
import jwt from "jsonwebtoken";
import { hash as sha256 } from "@stablelib/sha256";
import { fromString } from "uint8arrays";
import { Credential } from "../types/credential.js";

export type AccountJWT = {
  accountId: string
}

export interface IJwtService {
  /**
   * Generate JWT from credential and captcha token
   * @param credential ETH account credential {@link EthAccountVC}
   */
  toAccountJWT(credential: Credential): Promise<string>;

  /**
   *  Verify JWT and return payload, if token is invalid throw error
   * @param jwtToken
   */
  verifyToken<TPayload = any>(jwtToken: string): TPayload;

}

export class JwtService implements IJwtService {

  private readonly jwtSecret: Buffer;
  static inject = tokens(
    "config",
    "credentialVerifier",
    "captchaService"
  );
  constructor(
    private readonly config: { jwtSecret: string; apiKeysCredentialTTL: number },
  ) {
    this.jwtSecret = Buffer.from(sha256(fromString(this.config.jwtSecret, "utf8")));
  }

  async toAccountJWT(credential: Credential): Promise<string> {
    this.validateCredential(credential);
    const accountId = this.extractAccountId(credential);
    const jwtPayload: AccountJWT = {
      accountId: accountId
    };
    return jwt.sign(jwtPayload, this.jwtSecret);
  }

  /** Validate credential properties before API KEYS generating */
  private validateCredential(credential: Credential): credential is EthAccountVC {
    const { valid } = credentialUtil.validate(credential, {
      type: "EthereumAccount",
      reqExpDate: true,
      ttlRange: this.config.apiKeysCredentialTTL
    });
    return valid;
  }

  private extractAccountId(credential: Credential): string {
    return credential!.credentialSubject!.id.split(":").slice(2).join("");
  }

  verifyToken<TPayload = any>(jwtToken: string): TPayload {
    try {
      return jwt.verify(jwtToken, this.jwtSecret) as TPayload;
    } catch (e) {
      throw new ClientError("Invalid JWT token");
    }
  }
}
