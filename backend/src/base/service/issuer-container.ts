import type {
  ChainOwnerProof,
  ICredentialIssuer,
  IOAuthCallback,
  IOwnerProofHandler
} from "../credentials.js";
import type { ILogger } from "../../backbone/logger.js";
import type { OAuthState } from "../oauth.js";
import type { VCType } from "../model/const/vc-type.js";
import { type Disposable, type Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";
import { AnyObject } from "../../util/model.util.js";

type UnknownCredentialIssuer = ICredentialIssuer<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

// Mapping between types and runtime
const ISSUERS = {
  emptyIssuer: undefined,
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
  private readonly issuers: Map<VCType, UnknownCredentialIssuer>;

  static inject = tokens(INJECTOR_TOKEN, "logger");

  constructor(injector: Injector<Dependencies>, logger: ILogger) {
    this.issuers = new Map();
    const issuerIds = Object.keys(ISSUERS) as Array<keyof typeof ISSUERS>;
    for (const id of issuerIds) {
      const issuer = injector.resolve(id);
      const name = issuer.getProvidedVC();
      this.issuers.set(name, issuer);
      logger.info(`Added ${name} issuer`);
    }
  }

  canIssue(vcType: VCType, entry: unknown): Promise<unknown> {
    const issuer = this.getIssuer(vcType);
    return issuer.canIssue(entry);
  }

  /**
   * Issue VC by vc type and vc request payload
   * @param vcType
   * @param vcRequest payload for create VC
   */
  issue(vcType: VCType, vcRequest: unknown): Promise<unknown> {
    const issuer = this.getIssuer(vcType);
    return issuer.issue(vcRequest);
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
    const issuer = this.getIssuer(oauthState.vcType as VCType);
    return issuer.handleOAuthCallback?.(code, oauthState);
  }

  async handleOwnerProof(
    credentialType: VCType,
    proof: AnyObject
  ): Promise<AnyObject> {
    const issuer = this.getIssuer(credentialType);
    return await issuer.handleOwnerProof!(proof);
  }

  /**
   * Get payload for providing VC issue process
   * @param vcType type of VC that need to be issued
   * @param payloadRequest
   */
  getIssueVCPayload(
    vcType: VCType,
    payloadRequest?: unknown
  ): Promise<unknown> {
    const issuer = this.getIssuer(vcType);
    return issuer.getChallenge(payloadRequest);
  }

  /**
   * Get issuer by type of VC
   * @param vcType type of VC
   * @throws Error if issuer not found
   * @private
   */
  private getIssuer(
    vcType: VCType
  ): UnknownCredentialIssuer
    & Partial<IOAuthCallback>
    & Partial<IOwnerProofHandler<AnyObject, AnyObject>> {
    const issuer = this.issuers.get(vcType);
    if (issuer) {
      return issuer;
    }
    throw new ClientError(`Issuer ${vcType} not found`);
  }

  async dispose() {
    for (const issuer of this.issuers.values()) {
      if ("dispose" in issuer && typeof issuer.dispose === "function") {
        await issuer.dispose();
      }
    }
  }
}
