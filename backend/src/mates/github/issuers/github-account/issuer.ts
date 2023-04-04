import type {
  ICredentialIssuer,
  IOAuthCallback,
} from "../../../../base/service/credentials.js";
import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE
} from "../../../../base/service/credentials.js";
import { type Disposable, tokens } from "typed-inject";
import { GitHubService, type GitHubUser } from "../../github.service.js";
import { IProofService } from "../../../../base/service/proof.service.js";
import { DIDService } from "../../../../base/service/did.service.js";
import { ClientError } from "../../../../backbone/errors.js";
import type { IMultiSignService } from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../util/challenge.util.js";
import { TimedCache } from "../../../../base/service/timed-cache.js";
import { absoluteId } from "../../../../util/id.util.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../../base/types/oauth.js";
import { AnyObject } from "../../../../util/model.util.js";
import {
  CanIssueResp,
  CredentialType,
  CanIssueReq,
  Credential,
  GitHubAccountChallenge,
  GitHubAccountChallengeReq,
  GitHubAccountVC,
  GitHubAccountIssueReq,
} from "@sybil-center/sdk/types"

export type GitHubOAuthSession = {
  redirectUrl?: URL;
  issueChallenge: string;
  code?: string;
};

type GetGitHubAccountVC = {
  issuer: string;
  subjectDID: string;
  gitHubUser: GitHubUser;
  custom?: AnyObject;
  expirationDate?: Date;
}

async function getGitHubAccountVC(
  args: GetGitHubAccountVC
): Promise<GitHubAccountVC> {
  const gitHubUser = args.gitHubUser;
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "GitHubAccount"],
      issuer: { id: args.issuer },
      credentialSubject: {
        id: args.subjectDID,
        github: {
          id: gitHubUser.id,
          username: gitHubUser.login,
          userPage: gitHubUser.html_url
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
  implements ICredentialIssuer<
    GitHubAccountIssueReq,
    Credential,
    GitHubAccountChallengeReq,
    GitHubAccountChallenge
  >,
    IOAuthCallback,
    Disposable {
  static inject = tokens(
    "multiSignService",
    "proofService",
    "didService",
    "config"
  );

  readonly sessionCache: TimedCache<string, GitHubOAuthSession>;
  readonly gitHubService: GitHubService;

  constructor(
    private multiSignService: IMultiSignService,
    private proofService: IProofService,
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

  async getChallenge(req?: GitHubAccountChallengeReq): Promise<GitHubAccountChallenge> {
    const sessionId = absoluteId();
    const redirectUrl = req?.redirectUrl
      ? new URL(req.redirectUrl)
      : undefined;
    const custom = req?.custom;
    const expirationDate = req?.expirationDate;
    const issueChallenge = toIssueChallenge({
      type: this.providedCredential,
      custom: custom,
      expirationDate: expirationDate
    });
    this.sessionCache.set(sessionId, {
      redirectUrl: redirectUrl,
      issueChallenge: issueChallenge
    });
    const authUrl = this.gitHubService.getOAuthLink({
      sessionId: sessionId,
      credentialType: this.providedCredential,
      scope: ["read:user"]
    });
    return {
      authUrl: authUrl.href,
      sessionId: sessionId,
      issueChallenge: issueChallenge
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
    signAlg,
    publicId,
    signature
  }: GitHubAccountIssueReq): Promise<Credential> {
    const session = this.sessionCache.get(sessionId);
    const { issueChallenge, code } = session;
    if (!code) {
      throw new ClientError("GitHub processing your authorization. Wait!");
    }
    const subjectDID = await this.multiSignService
      .signAlg(signAlg)
      .did(signature, issueChallenge, publicId);
    const { custom, expirationDate } = fromIssueChallenge(issueChallenge);
    const accessToken = await this.gitHubService.getAccessToken(code);
    const gitHubUser = await this.gitHubService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const vc = await getGitHubAccountVC({
      issuer: this.didService.id,
      subjectDID: subjectDID,
      gitHubUser: gitHubUser,
      custom: custom,
      expirationDate: expirationDate
    });
    return this.proofService.jwsSing(vc);
  }

  get providedCredential(): CredentialType {
    return "GitHubAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
