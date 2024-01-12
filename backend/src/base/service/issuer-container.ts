import type { ICredentialIssuer, IOAuthCallback } from "../types/issuer.js";
import type { ILogger } from "../../backbone/logger.js";
import type { OAuthState } from "../types/oauth.js";
import { type Disposable, type Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { ClientErr } from "../../backbone/errors.js";
import {
  CanIssueReq,
  CanIssueResp,
  Challenge,
  ChallengeReq,
  Credential,
  CredentialType,
  IssueReq
} from "@sybil-center/sdk/types";

type UnknownCredentialIssuer = ICredentialIssuer<
  IssueReq,
  Credential,
  ChallengeReq,
  Challenge,
  CanIssueReq,
  CanIssueResp
>;

// Mapping between types and runtime
const ISSUERS = {
  ethereumAccountIssuer: undefined,
  discordAccountIssuer: undefined,
  twitterAccountIssuer: undefined,
  gitHubAccountIssuer: undefined
};

type Dependencies = Record<keyof typeof ISSUERS, UnknownCredentialIssuer>;

/**
 * Issued VC
 */
export class IssuerContainer implements Disposable {
  private readonly issuers: Map<CredentialType, UnknownCredentialIssuer>;

  static inject = tokens(INJECTOR_TOKEN, "logger");

  constructor(injector: Injector<Dependencies>, logger: ILogger) {
    this.issuers = new Map();
    const issuerIds = Object.keys(ISSUERS) as Array<keyof typeof ISSUERS>;
    for (const id of issuerIds) {
      const issuer = injector.resolve(id);
      const name = issuer.providedCredential;
      this.issuers.set(name, issuer);
      logger.info(`Added ${name} issuer`);
    }
  }

  canIssue(type: CredentialType, entry: CanIssueReq): Promise<CanIssueResp> {
    const issuer = this.getIssuer(type);
    return issuer.canIssue(entry);
  }

  /**
   * Issue VC by vc type and vc request payload
   * @param type
   * @param issueReq payload for create VC
   */
  issue(type: CredentialType, issueReq: IssueReq): Promise<Credential> {
    const issuer = this.getIssuer(type);
    return issuer.issue(issueReq);
  }

  /**
   * Handle callback for issue VC
   * @param code - OAuth token
   * @param oauthState - OAuth state encoded
   */
  async handleOAuthCallback(
    code: string,
    oauthState: OAuthState
  ): Promise<URL | undefined> {
    const issuer = this.getIssuer(oauthState.credentialType as CredentialType);
    return issuer.handleOAuthCallback?.(code, oauthState);
  }

  /**
   * Get payload for providing VC issue process
   * @param type type of VC that need to be issued
   * @param challengeReq
   */
  getChallenge(
    type: CredentialType,
    challengeReq: ChallengeReq
  ): Promise<Challenge> {
    const issuer = this.getIssuer(type);
    return issuer.getChallenge(challengeReq);
  }

  /**
   * Get issuer by type of VC
   * @throws Error if issuer not found
   * @private
   * @param type
   */
  private getIssuer(
    type: CredentialType
  ): UnknownCredentialIssuer
    & Partial<IOAuthCallback> {
    const issuer = this.issuers.get(type);
    if (issuer) return issuer;
    throw new ClientErr(`Issuer ${type} not found`);
  }

  async dispose() {
    for (const issuer of this.issuers.values()) {
      if ("dispose" in issuer && typeof issuer.dispose === "function") {
        await issuer.dispose();
      }
    }
  }
}
