import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../base/types/zkc.issuer.js";
import { tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";
import { IOAuthCallback } from "../../base/types/issuer.js";
import { OAuthState } from "../../base/types/oauth.js";
import { Proved, ZkCred, ZkcSchemaNames, ZkcSchemaNums } from "../../base/types/zkc.credential.js";
import { ZkcGitHubAccountIssuer } from "./github-account/index.js";
import { IWebhookHandler } from "../../base/types/webhook-handler.js";
import { ZkcPassportIssuer } from "./passport/issuer.js";
import { FastifyRequest } from "fastify";
import { ZKC } from "../../util/zk-credentials/index.js";


type IssuerImpls = IZkcIssuer & Partial<IOAuthCallback> & Partial<IWebhookHandler>


export class ZkcIssuerManager {

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
      [zkcPassportIssuer.providedSchema, zkcPassportIssuer],
      [zkcGitHubAccountIssuer.providedSchema, zkcGitHubAccountIssuer],
    ]);
  }

  async callbackOAuth(
    code: string,
    oauthState: OAuthState
  ): Promise<URL | undefined> {
    const issuer = this.issuer(ZKC.schema.toNum(oauthState.credentialType));
    return issuer.handleOAuthCallback?.(code, oauthState);
  }

  async handleWebhook(alias: ZkcSchemaNames | ZkcSchemaNums, req: FastifyRequest): Promise<any> {
    const issuer = this.issuer(alias);
    return issuer.handleWebhook?.(req);
  }

  issuer(alias: ZkcSchemaNames | ZkcSchemaNums): IssuerImpls {
    const target = typeof alias === "string" ? ZKC.schema.toNum(alias) : alias;
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

  issue(
    alias: ZkcSchemaNames | ZkcSchemaNums,
    issueReq: ZkcIssueReq
  ): Promise<Proved<ZkCred>> {
    return this.issuer(alias).issue(issueReq);
  }

  canIssue(
    alias: ZkcSchemaNames | ZkcSchemaNums,
    entry: ZkcCanIssueReq
  ): Promise<ZkcCanIssueResp> {
    return this.issuer(alias).canIssue(entry);
  }
}
