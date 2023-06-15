import { Credential, EthAccountVC } from "@sybil-center/sdk";
import { tokens } from "typed-inject";
import { CredentialVerifier } from "./credential-verifivator.js";
import { ClientError } from "../../backbone/errors.js";
import { credentialUtil } from "../../util/credential.utils.js";
import { ICaptchaService } from "./captcha.service.js";
import jwt from "jsonwebtoken";
import { hash as sha256 } from "@stablelib/sha256";
import { fromString } from "uint8arrays";


type ToAccountJWT = {
  credential: EthAccountVC;
  captchaToken?: string;
}

export type AccountJWT = {
  accountId: string
}

export interface IJwtService {
  /**
   * Generate JWT from credential and captcha token
   * @param credential ETH account credential {@link EthAccountVC}
   * @param captchaToken
   */
  toAccountJWT({ credential, captchaToken }: ToAccountJWT): Promise<string>;

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
    private readonly verifier: CredentialVerifier,
    private readonly captchaService: ICaptchaService
  ) {
    this.jwtSecret = Buffer.from(sha256(fromString(this.config.jwtSecret, "utf8")));
  }

  async toAccountJWT({ credential, captchaToken }: ToAccountJWT): Promise<string> {
    this.validateCredential(credential);
    if (captchaToken) await this.validateCaptcha(captchaToken);
    const { isVerified } = await this.verifier.verify(credential);
    if (!isVerified) throw new ClientError("Credential is not verified");
    const accountId = this.extractAccountId(credential);
    const jwtPayload: AccountJWT = {
      accountId: accountId
    };
    return jwt.sign(jwtPayload, this.jwtSecret);
  }

  /** Validate credential properties before API KEYS generating */
  private validateCredential(credential: EthAccountVC): void {
    const { valid, reason } = credentialUtil.validate(credential, {
      type: "EthereumAccount",
      reqExpDate: true,
      ttlRange: this.config.apiKeysCredentialTTL
    });
    if (!valid) throw new ClientError(reason!);
  }

  /** Validate CAPTCHA */
  private async validateCaptcha(captchaToken: string): Promise<void> {
    const { isHuman } = await this.captchaService.isHuman(captchaToken, "login");
    if (!isHuman) throw new ClientError("Non human actions was detected");
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
