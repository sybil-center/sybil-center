import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../base/types/zkc.issuer.js";
import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { ILogger } from "../../backbone/logger.js";
import { zkc } from "../../util/zk-credentials.util.js";
import { ClientError } from "../../backbone/errors.js";
import { IOAuthCallback } from "../../base/types/issuer.js";
import { OAuthState } from "../../base/types/oauth.js";
import { ZkCredProofed } from "../../base/types/zkc.credential.js";

export interface IZkcIssuerManager {
  issuer(alias: string | number): IZkcIssuer & Partial<IOAuthCallback>;

  getChallenge(
    alias: string | number,
    challengeReq: ZkcChallengeReq
  ): Promise<ZkcChallenge>;

  callbackOAuth(
    code: string,
    oauthState: OAuthState
  ): Promise<URL | undefined>;

  canIssue(
    alias: string | number,
    canReq: ZkcCanIssueReq
  ): Promise<ZkcCanIssueResp>;

  issue(
    alias: string | number,
    issueReq: ZkcIssueReq
  ): Promise<ZkCredProofed>;
}

const issuersTokens = [
  "zkcGithubAccountIssuer"
] as const;

type Dependencies = Record<typeof issuersTokens[number], IZkcIssuer>

export class ZkcIssuerManager implements IZkcIssuerManager {

  private readonly issuers: Map<number, IZkcIssuer>;

  static inject = tokens(INJECTOR_TOKEN, "logger");

  constructor(
    injector: Injector<Dependencies>,
    logger: ILogger
  ) {
    this.issuers = new Map();
    issuersTokens.forEach((token) => {
      const issuer = injector.resolve(token);
      const schema = issuer.providedSchema;
      this.issuers.set(schema, issuer);
      logger.info(`Added ZKC ${zkc.toSchemaName(schema)} issuer`);
    });
  }

  issuer(alias: string | number): IZkcIssuer & Partial<IOAuthCallback> {
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

  canIssue(
    alias: string | number,
    canReq: ZkcCanIssueReq
  ): Promise<ZkcCanIssueResp> {
    return this.issuer(alias).canIssue(canReq);
  }

  issue(
    alias: string | number,
    issueReq: ZkcIssueReq
  ): Promise<ZkCredProofed> {
    return this.issuer(alias).issue(issueReq);
  }
}
