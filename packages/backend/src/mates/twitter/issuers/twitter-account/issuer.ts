import type {
  CanIssueReq,
  CanIssueRes,
  ICredentialIssuer,
  IOAuthCallback,
  VC
} from "../../../../base/credentials.js";
import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE
} from "../../../../base/credentials.js";
import { Disposable, tokens } from "typed-inject";
import { IProofService } from "../../../../base/service/proof-service.js";
import { TwitterService, type TwitterUser } from "../../twitter.service.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { absoluteId } from "../../../../util/id-util.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ClientError } from "../../../../backbone/errors.js";
import type {
  IMultiSignService,
  SignAlgAlias
} from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../util/challenge.util.js";
import { TimedCache } from "../../../../base/timed-cache.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../../base/oauth.js";

export interface TwitterAccOwnershipVC extends VC {
  credentialSubject: {
    id: string;
    twitter: {
      id: string;
      username: string;
    };
    custom?: { [key: string]: any };
  };
}

interface TwitterAccOwnershipPayloadRequest {
  body: {
    redirectUrl?: string;
    custom?: object;
  };
}

/**
 * Request entity for generate twitter account ownership VC
 */
interface TwitterAccOwnershipRequest {
  sessionId: string;
  signAlg?: SignAlgAlias;
  publicId: string;
  /**
   * Signature from sign message from payload sign by wallet / private key
   */
  signature: string;
}

/**
 * Payload for issue VC of Twitter account ownership {@link TwitterAccountOwnershipCredential}
 *
 * {@see https://www.rfc-editor.org/rfc/rfc6749}
 * {@see https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code}
 */
export interface TwitterAccOwnershipPayload {
  /**
   * Ref to authenticate user in Twitter
   */
  authUrl: string;

  /**
   * Property responsible for save user session for
   * safe get "code" needed to authenticate user
   */
  sessionId: string;

  /**
   * Message for sign by wallet / private key
   */
  issueChallenge: string;
}

/**
 * Return Twitter account ownership VC
 */
async function getTwitterAccOwnerVC(
  issuer: string,
  subjectDID: string,
  twitterUser: TwitterUser,
  custom?: object
): Promise<TwitterAccOwnershipVC> {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.TwitterAccount],
      issuer: { id: issuer },
      credentialSubject: {
        id: subjectDID,
        twitter: {
          id: twitterUser.id,
          username: twitterUser.username
        },
        custom: custom
      },
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

type TwitterOAuthSession = {
  redirectUrl?: URL;
  issueChallenge: string;
  code?: string;
  codeVerifier: string;
};

/**
 * Issue Twitter account ownership VC
 */
export class TwitterAccountIssuer
  implements ICredentialIssuer<
    TwitterAccOwnershipRequest,
    VC,
    TwitterAccOwnershipPayloadRequest,
    TwitterAccOwnershipPayload,
    CanIssueReq,
    CanIssueRes
  >,
    IOAuthCallback,
    Disposable {
  static inject = tokens(
    "proofService",
    "multiSignService",
    "didService",
    "config"
  );

  readonly sessionCache: TimedCache<string, TwitterOAuthSession>;
  readonly twitterService: TwitterService;

  constructor(
    private proofService: IProofService,
    private multiSignService: IMultiSignService,
    private readonly didService: DIDService,
    config: {
      oAuthSessionTtl: number;
      pathToExposeDomain: URL;
      twitterClientId: string;
      twitterClientSecret: string;
    }
  ) {
    this.sessionCache = new TimedCache(config.oAuthSessionTtl);
    this.twitterService = new TwitterService(config);
  }

  async getChallenge({
    body
  }: TwitterAccOwnershipPayloadRequest): Promise<TwitterAccOwnershipPayload> {
    const userRedirectUrl = body?.redirectUrl
      ? new URL(body?.redirectUrl)
      : undefined;
    const custom = body?.custom;

    const sessionId = absoluteId();
    const issueChallenge = toIssueChallenge(this.getProvidedVC(), custom);

    const { authUrl, codeVerifier } = this.twitterService.getOAuthLink({
      sessionId: sessionId,
      vcType: this.getProvidedVC(),
      scope: ["offline.access", "tweet.read", "users.read"]
    });
    this.sessionCache.set(sessionId, {
      codeVerifier: codeVerifier,
      redirectUrl: userRedirectUrl,
      issueChallenge: issueChallenge
    });
    return {
      authUrl: authUrl,
      sessionId: sessionId,
      issueChallenge: issueChallenge
    };
  }

  async handleOAuthCallback(code: string, state: OAuthState): Promise<URL | undefined> {
    const sessionId = state.sessionId;
    const session = this.sessionCache.get(sessionId);
    session.code = code;
    this.sessionCache.set(sessionId, session);
    return session.redirectUrl;
  }

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssueRes> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signAlg,
    publicId,
    signature
  }: TwitterAccOwnershipRequest): Promise<VC> {
    const session = this.sessionCache.get(sessionId);
    const { code, codeVerifier, issueChallenge } = session;
    if (!code) {
      throw new ClientError("Twitter processing your authorization. Wait!");
    }
    const subjectDID = await this.multiSignService
      .signAlg(signAlg)
      .did(signature, issueChallenge, publicId);
    const { custom } = fromIssueChallenge(issueChallenge);
    const accessToken = await this.twitterService.getAccessToken({
      code: code,
      codeVerifier: codeVerifier
    });
    const twitterUser = await this.twitterService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const vc = await getTwitterAccOwnerVC(
      this.didService.id,
      subjectDID,
      twitterUser,
      custom
    );
    return this.proofService.jwsSing(vc);
  }

  getProvidedVC(): VCType {
    return VCType.TwitterAccount;
  }

  dispose() {
    this.sessionCache.dispose();
  }
}
