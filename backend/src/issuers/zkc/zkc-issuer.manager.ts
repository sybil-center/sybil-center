import {
  CanIssueReq,
  CanIssueResp,
  Challenge,
  IssueReq,
  ISybilIssuer,
  SchemaName,
  SybilChallengeReq
} from "@sybil-center/zkc-core";
import { IWebhookHandler } from "../../base/types/webhook-handler.js";
import { Disposable, tokens } from "typed-inject";
import { type ZKCPassportIssuer } from "./passport/issuer.js";
import { ClientErr } from "../../backbone/errors.js";
import { FastifyRequest } from "fastify";
import { ILogger } from "../../backbone/logger.js";

type Issuer = ISybilIssuer & Partial<IWebhookHandler>

export class ZKCIssuerManager implements Disposable {
  private readonly issuers: Record<SchemaName, Issuer>;

  static inject = tokens(
    "logger",
    "zkcPassportIssuer",
  );
  constructor(
    logger: ILogger,
    passportIssuer: ZKCPassportIssuer
  ) {
    this.issuers = {
      "passport": passportIssuer
    };
    for (const issuerName in this.issuers) {
      logger.info(`Added ${issuerName} zero-knowledge credential issuer`);
    }

  }

  issuer(name: SchemaName) {
    const issuer = this.issuers[name];
    if (issuer) return issuer;
    throw new ClientErr(`${name} schema is not supported`);
  }

  getChallenge(
    name: SchemaName,
    challengeReq: SybilChallengeReq
  ): Promise<Challenge> {
    const issuer = this.issuer(name);
    return issuer.getChallenge(challengeReq);
  }

  canIssue(
    name: SchemaName,
    canIssueReq: CanIssueReq
  ): Promise<CanIssueResp> {
    return this.issuer(name).canIssue(canIssueReq);
  }

  handleWebhook(name: SchemaName, req: FastifyRequest) {
    return this.issuer(name).handleWebhook?.(req);
  }

  issueCred(name: SchemaName, issueReq: IssueReq) {
    return this.issuer(name).issue(issueReq);
  }

  async dispose(): Promise<void> {}

}
