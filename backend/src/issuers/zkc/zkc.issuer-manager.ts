import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../base/types/zkc.issuer.js";
import { Disposable, tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";
import { IOAuthCallback } from "../../base/types/issuer.js";
import { OAuthState } from "../../base/types/oauth.js";
import { ZkCredProved, ZkcSchemaNames, ZkcSchemaNums } from "../../base/types/zkc.credential.js";
import { ZkcGitHubAccountIssuer } from "./github-account/index.js";
import { IWebhookHandler } from "../../base/types/webhook-handler.js";
import { ZkcPassportIssuer } from "./passport/issuer.js";
import { FastifyRequest } from "fastify";
import { Zkc } from "../../util/zk-credentials/index.js";

type IssuerImpls = IZkcIssuer & Partial<IOAuthCallback> & Partial<IWebhookHandler>

export class ZkcIssuerManager implements Disposable {

  private readonly issuers: Map<ZkcSchemaNums, IssuerImpls>;

  static inject = tokens(
    "zkcGitHubAccountIssuer",
    "zkcPassportIssuer"
  );

  constructor(
    zkcGitHubAccountIssuer: ZkcGitHubAccountIssuer,
    zkcPassportIssuer: ZkcPassportIssuer
  ) {
    this.issuers = new Map<ZkcSchemaNums, IssuerImpls>([
      [zkcGitHubAccountIssuer.providedSchema, zkcGitHubAccountIssuer],
      [zkcPassportIssuer.providedSchema, zkcPassportIssuer]
    ]);
  }

  issuer(alias: ZkcSchemaNames | ZkcSchemaNums): IssuerImpls {
    const target = typeof alias === "string" ? Zkc.schema.toNum(alias) : alias;
    const zkcIssuer = this.issuers.get(target);
    if (zkcIssuer) return zkcIssuer;
    throw new ClientError(`ZK Credential with schema ${alias} is not supported`);
  }

  getChallenge(
    alias: ZkcSchemaNames | ZkcSchemaNums,
    challengeReq: ZkcChallengeReq
  ): Promise<ZkcChallenge> {
    const issuer = this.issuer(alias);
    return issuer.getChallenge(challengeReq);
  }

  async callbackOAuth(
    code: string,
    oauthState: OAuthState
  ): Promise<URL | undefined> {
    const issuer = this.issuer(Zkc.schema.toNum(oauthState.credentialType));
    return issuer.handleOAuthCallback?.(code, oauthState);
  }

  async handleWebhook(alias: ZkcSchemaNames | ZkcSchemaNums, req: FastifyRequest): Promise<any> {
    const issuer = this.issuer(alias);
    return issuer.handleWebhook?.(req);
  }

  canIssue(
    alias: ZkcSchemaNames | ZkcSchemaNums,
    canReq: ZkcCanIssueReq
  ): Promise<ZkcCanIssueResp> {
    return this.issuer(alias).canIssue(canReq);
  }

  issue(
    alias: ZkcSchemaNames | ZkcSchemaNums,
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
