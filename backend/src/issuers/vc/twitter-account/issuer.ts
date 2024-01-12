import type { ICredentialIssuer, IOAuthCallback, } from "../../../base/types/issuer.js";
import { DEFAULT_CREDENTIAL_CONTEXT, DEFAULT_CREDENTIAL_TYPE } from "../../../base/types/issuer.js";
import { Disposable, tokens } from "typed-inject";
import { ProofService } from "../../../base/service/proof.service.js";
import { TwitterService, type TwitterUser } from "../../../base/service/external/twitter.service.js";
import { DIDService } from "../../../base/service/did.service.js";
import { absoluteId } from "../../../util/id.util.js";
import { ClientErr } from "../../../backbone/errors.js";
import type { IMultiSignService } from "../../../base/service/multi-sign.service.js";
import { fromIssueMessage, toIssueMessage } from "../../../util/message.util.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../base/types/oauth.js";
import { AnyObj, extractProps } from "../../../util/model.util.js";
import {
  CanIssueReq,
  CanIssueResp,
  Credential,
  CredentialType,
  TwitterAccountChallenge,
  TwitterAccountChallengeReq,
  TwitterAccountIssueReq,
  twitterAccountProps,
  TwitterAccountVC
} from "@sybil-center/sdk/types";

type GetTwitterAccountArgs = {
  issuer: string;
  subjectId: string;
  twitterUser: TwitterUser;
  custom?: AnyObj;
  expirationDate?: Date;
  props?: string[]
}

type TwitterOAuthSession = {
  redirectUrl?: URL;
  issueMessage: string;
  code?: string;
  codeVerifier: string;
};

/** Return Twitter account ownership VC */
async function getTwitterAccountVC(
  args: GetTwitterAccountArgs
): Promise<TwitterAccountVC> {
  const twitterUser = extractProps(args.twitterUser, args.props);
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "TwitterAccount"],
      issuer: { id: args.issuer },
      credentialSubject: {
        id: args.subjectId,
        twitter: {
          ...twitterUser
        },
        custom: args.custom
      },
      expirationDate: args.expirationDate,
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

/** Issue Twitter account ownership VC */
export class TwitterAccountIssuer
  implements ICredentialIssuer<
    TwitterAccountIssueReq,
    Credential,
    TwitterAccountChallengeReq,
    TwitterAccountChallenge
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
    private proofService: ProofService,
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

  async getChallenge(req: TwitterAccountChallengeReq): Promise<TwitterAccountChallenge> {
    const sessionId = absoluteId();
    const userRedirectUrl = req?.redirectUrl
      ? new URL(req?.redirectUrl)
      : undefined;
    const issueMessage = toIssueMessage({
      subjectId: req.subjectId,
      type: this.providedCredential,
      custom: req.custom,
      expirationDate: req.expirationDate,
      twitterProps: {
        value: req.props,
        default: twitterAccountProps
      }
    });
    const { authUrl, codeVerifier } = this.twitterService.getOAuthLink({
      sessionId: sessionId,
      credentialType: this.providedCredential,
      scope: ["offline.access", "tweet.read", "users.read"]
    });
    this.sessionCache.set(sessionId, {
      codeVerifier: codeVerifier,
      redirectUrl: userRedirectUrl,
      issueMessage: issueMessage
    });
    return {
      authUrl: authUrl,
      sessionId: sessionId,
      issueMessage: issueMessage
    };
  }

  async handleOAuthCallback(code: string, state: OAuthState): Promise<URL | undefined> {
    const sessionId = state.sessionId;
    const session = this.sessionCache.get(sessionId);
    session.code = code;
    this.sessionCache.set(sessionId, session);
    return session.redirectUrl;
  }

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssueResp> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signature
  }: TwitterAccountIssueReq): Promise<Credential> {
    const session = this.sessionCache.get(sessionId);
    const { code, codeVerifier, issueMessage } = session;
    if (!code) {
      throw new ClientErr("Twitter processing your authorization. Wait!");
    }
    const { custom, expirationDate, subjectId, twitterProps } = fromIssueMessage(issueMessage);
    await this.multiSignService.verify({
      subjectId: subjectId,
      signature: signature,
      message: issueMessage
    });
    const accessToken = await this.twitterService.getAccessToken({
      code: code,
      codeVerifier: codeVerifier
    });
    const twitterUser = await this.twitterService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const vc = await getTwitterAccountVC({
      issuer: this.didService.id,
      subjectId: subjectId,
      twitterUser: twitterUser,
      custom: custom,
      expirationDate: expirationDate,
      props: twitterProps
    });
    return this.proofService.sign("JsonWebSignature2020", vc);
  }

  get providedCredential(): CredentialType {
    return "TwitterAccount";
  }

  dispose() {
    this.sessionCache.dispose();
  }
}
