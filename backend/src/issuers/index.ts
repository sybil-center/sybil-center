import { IWebhookHandler } from "../services/types/webhook-handler.js";
import { IHttpIssuer } from "@zcredjs/core";
import { tokens } from "typed-inject";
import { PassportIssuer } from "./passport/index.js";
import { ILogger } from "../backbone/logger.js";
import { ServerErr } from "../backbone/errors.js";
import { CredentialType } from "../services/sybiljs/types/index.js";

type Issuer = IHttpIssuer & Partial<IWebhookHandler>

export class PrincipalIssuer {
  private readonly issuers: Record<CredentialType, Issuer>;

  static inject = tokens(
    "logger",
    "passportIssuer",
  );
  constructor(
    logger: ILogger,
    passportIssuer: PassportIssuer,
  ) {
    this.issuers = {
      "passport": passportIssuer,
    };
    Object.keys(this.issuers)
      .forEach((type) => logger.info(`ZCred ${type} issuer initialized `));
  }

  getIssuer(credType: CredentialType): Issuer {
    const issuer = this.issuers[credType];
    if (issuer) return issuer;
    throw new ServerErr({
      message: "Internal server error",
      place: this.constructor.name,
      description: `Can not find zcred issuer by credential type ${credType}`
    });
  }
}
