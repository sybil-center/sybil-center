import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../base/types/zkc.issuer.js";
import { Disposable, tokens } from "typed-inject";
import { zkc } from "../../util/zk-credentials.util.js";
import { ClientError } from "../../backbone/errors.js";
import { IOAuthCallback } from "../../base/types/issuer.js";
import { OAuthState } from "../../base/types/oauth.js";
import { ZkCredProved } from "../../base/types/zkc.credential.js";
import { ZkcGitHubAccountIssuer } from "./github-account/index.js";
import { IWebhookHandler } from "../../base/types/webhook-handler.js";
import { ZkcPassportIssuer } from "./passport/issuer.js";
import { FastifyRequest } from "fastify";

type IssuerImpls = IZkcIssuer & Partial<IOAuthCallback> & Partial<IWebhookHandler>

export class ZkcIssuerManager implements Disposable {

  private readonly issuers: Map<number, IssuerImpls>;

  static inject = tokens(
    "zkcGitHubAccountIssuer",
    "zkcPassportIssuer"
  );

  constructor(
    zkcGitHubAccountIssuer: ZkcGitHubAccountIssuer,
    zkcPassportIssuer: ZkcPassportIssuer
  ) {
    this.issuers = new Map<number, IssuerImpls>([
      [zkcGitHubAccountIssuer.providedSchema, zkcGitHubAccountIssuer],
      [zkcPassportIssuer.providedSchema, zkcPassportIssuer]
    ]);
  }

  issuer(alias: string | number): IssuerImpls {
    const target = typeof alias === "string" ? zkc.toSchemaNum(alias) : alias;
    const zkcIssuer = this.issuers.get(target);
    if (zkcIssuer) return zkcIssuer;
    throw new ClientError(`ZK Credential with schema ${alias} is not supported`);
  }

  getChallenge(
    alias: string | number,
    challengeReq: ZkcChallengeReq
  ): Promise<ZkcChallenge> {
    const issuer = this.issuer(alias);
    return issuer.getChallenge(challengeReq);
  }

  async callbackOAuth(
    code: string,
    oauthState: OAuthState
  ): Promise<URL | undefined> {
    const issuer = this.issuer(zkc.toSchemaNum(oauthState.credentialType));
    return issuer.handleOAuthCallback?.(code, oauthState);
  }

  async handleWebhook(alias: string | number, req: FastifyRequest): Promise<any> {
    const issuer = this.issuer(alias);
    return issuer.handleWebhook?.(req);
  }

  canIssue(
    alias: string | number,
    canReq: ZkcCanIssueReq
  ): Promise<ZkcCanIssueResp> {
    return this.issuer(alias).canIssue(canReq);
  }

  issue(
    alias: string | number,
    issueReq: ZkcIssueReq
  ): Promise<ZkCredProved> {
    return this.issuer(alias).issue(issueReq);
  }

  async dispose() {
    for (const issuer of this.issuers.values()) {
      if ("dispose" in issuer && typeof issuer.dispose === "function") {
        await issuer.dispose();
      }
    }
  }
}
