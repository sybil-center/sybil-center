import type { IOAuthCallback, IVCCredentialIssuer, } from "../../../services/vc/vc-issuer.js";
import { DEFAULT_CREDENTIAL_CONTEXT, DEFAULT_CREDENTIAL_TYPE } from "../../../services/vc/vc-issuer.js";
import { type Disposable, tokens } from "typed-inject";
import { GitHubService, type GitHubUser } from "../../../services/github.service.js";
import { VCSignatureProver } from "../../../services/vc/vc-signature-prover.js";
import { DIDService } from "../../../services/did.service.js";
import { ClientErr } from "../../../backbone/errors.js";
import type { VCMultiSignatureService } from "../../../services/vc/vc-sign-message/multi-sign.service.js";
import { fromIssueMessage, toIssueMessage } from "../../../util/message.util.js";
import { TimedCache } from "../../../services/timed-cache.js";
import { absoluteId } from "../../../util/id.util.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../types/codec/oauth.js";
import { extractProps } from "../../../util/model.util.js";
import {
  CanIssueReq,
  CanIssueResp,
  Credential,
  CredentialType,
  GitHubAccountChallenge,
  GitHubAccountChallengeReq,
  GitHubAccountIssueReq,
  githubAccountProps,
  GitHubAccountVC,
} from "@sybil-center/sdk/types";

export type GitHubOAuthSession = {
  redirectUrl?: URL;
  issueMessage: string;
  code?: string;
};

type GetGitHubAccountVC = {
  issuer: string;
  subjectId: string;
  gitHubUser: GitHubUser;
  custom?: Record<string, any>;
  expirationDate?: Date;
  props?: string[];
}

async function getGitHubAccountVC(
  args: GetGitHubAccountVC
): Promise<GitHubAccountVC> {
  const gitHubUser = extractProps(args.gitHubUser, args.props);

  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "GitHubAccount"],
      issuer: { id: args.issuer },
      credentialSubject: {
        id: args.subjectId,
        github: {
          ...gitHubUser
        },
        custom: args.custom
      },
      expirationDate: args.expirationDate,
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

export class GitHubAccountIssuer
  implements IVCCredentialIssuer<
    GitHubAccountIssueReq,
    Credential,
    GitHubAccountChallengeReq,
    GitHubAccountChallenge
  >,
    IOAuthCallback,
    Disposable {
  static inject = tokens(
    "vcMultiSignatureService",
    "vcSignatureProver",
    "didService",
    "config"
  );

  readonly sessionCache: TimedCache<string, GitHubOAuthSession>;
  readonly gitHubService: GitHubService;

  constructor(
    private vcMultiSignatureService: VCMultiSignatureService,
    private vcSignatureProver: VCSignatureProver,
    private readonly didService: DIDService,
    config: {
      oAuthSessionTtl: number;
      pathToExposeDomain: URL;
      gitHubClientSecret: string;
      gitHubClientId: string;
    }
  ) {
    this.sessionCache = new TimedCache(config.oAuthSessionTtl);
    this.gitHubService = new GitHubService(config);
  }

  async getChallenge(req: GitHubAccountChallengeReq): Promise<GitHubAccountChallenge> {
    const sessionId = absoluteId();
    const redirectUrl = req.redirectUrl
      ? new URL(req.redirectUrl)
      : undefined;

    const issueMessage = toIssueMessage({
      subjectId: req.subjectId,
      type: this.providedCredential,
      custom: req.custom,
      expirationDate: req.expirationDate,
      githubProps: {
        value: req.props,
        default: githubAccountProps
      }
    });
    this.sessionCache.set(sessionId, {
      redirectUrl: redirectUrl,
      issueMessage: issueMessage
    });
    const authUrl = this.gitHubService.getOAuthLink({
      sessionId: sessionId,
      credentialType: this.providedCredential,
      scope: ["read:user"]
    });
    return {
      authUrl: authUrl.href,
      sessionId: sessionId,
      issueMessage: issueMessage
    };
  }

  async handleOAuthCallback(
    code: string,
    state: OAuthState
  ): Promise<URL | undefined> {
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
  }: GitHubAccountIssueReq): Promise<Credential> {
    const session = this.sessionCache.get(sessionId);
    const { issueMessage, code } = session;
    if (!code) {
      throw new ClientErr("GitHub processing your authorization. Wait!");
    }
    const { custom, expirationDate, subjectId, githubProps } = fromIssueMessage(issueMessage);
    await this.vcMultiSignatureService.verify({
      signature: signature,
      message: issueMessage,
      subjectId: subjectId
    });
    const accessToken = await this.gitHubService.getAccessToken(code);
    const gitHubUser = await this.gitHubService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const vc = await getGitHubAccountVC({
      issuer: this.didService.id,
      subjectId: subjectId,
      gitHubUser: gitHubUser,
      custom: custom,
      expirationDate: expirationDate,
      props: githubProps
    });
    return this.vcSignatureProver.sign("JsonWebSignature2020", vc);
  }

  get providedCredential(): CredentialType {
    return "GitHubAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
