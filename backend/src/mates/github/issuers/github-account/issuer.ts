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
import { type Disposable, tokens } from "typed-inject";
import { GitHubService, type GitHubUser } from "../../github.service.js";
import { IProofService } from "../../../../base/service/proof-service.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ClientError } from "../../../../backbone/errors.js";
import type {
  IMultiSignService,
  SignAlgAlias
} from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../util/challenge.util.js";
import { TimedCache } from "../../../../base/timed-cache.js";
import { absoluteId } from "../../../../util/id-util.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../../base/oauth.js";

export type GitHubOAuthSession = {
  redirectUrl?: URL;
  issueChallenge: string;
  code?: string;
};

export interface GitHubAccOwnershipVC extends VC {
  credentialSubject: {
    id: string;
    github: {
      id: number;
      username: string;
      userPage: string;
    };
    custom?: { [key: string]: any };
  };
}

export type GitHubAccOwnershipRequest = {
  sessionId: string;
  signAlg?: SignAlgAlias;
  publicId: string;
  signature: string;
};

export type GitHubAccOwnershipPayload = {
  authUrl: string;
  sessionId: string;
  issueChallenge: string;
};

export type GitHubAccOwnershipPayloadRequest = {
  body: {
    redirectUrl?: string;
    custom?: object;
  };
};

async function getGitHubAccOwnVC(
  issuer: string,
  subjectDID: string,
  gitHubUser: GitHubUser,
  custom?: object
): Promise<GitHubAccOwnershipVC> {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.GitHubAccount],
      issuer: { id: issuer },
      credentialSubject: {
        id: subjectDID,
        github: {
          id: gitHubUser.id,
          username: gitHubUser.login,
          userPage: gitHubUser.html_url
        },
        custom: custom
      },
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

export class GitHubAccountIssuer
  implements ICredentialIssuer<
    GitHubAccOwnershipRequest,
    VC,
    GitHubAccOwnershipPayloadRequest,
    GitHubAccOwnershipPayload,
    CanIssueReq,
    CanIssueRes
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

  async getChallenge({
    body
  }: GitHubAccOwnershipPayloadRequest): Promise<GitHubAccOwnershipPayload> {
    const redirectUrl = body?.redirectUrl
      ? new URL(body.redirectUrl)
      : undefined;
    const custom = body?.custom;

    const issueChallenge = toIssueChallenge(this.getProvidedVC(), custom);
    const sessionId = absoluteId();
    this.sessionCache.set(sessionId, {
      redirectUrl: redirectUrl,
      issueChallenge: issueChallenge
    });
    const authUrl = this.gitHubService.getOAuthLink({
      sessionId: sessionId,
      vcType: this.getProvidedVC(),
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

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssueRes> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signAlg,
    publicId,
    signature
  }: GitHubAccOwnershipRequest): Promise<VC> {
    const session = this.sessionCache.get(sessionId);
    const { issueChallenge, code } = session;
    if (!code) {
      throw new ClientError("GitHub processing your authorization. Wait!");
    }
    const subjectDID = await this.multiSignService
      .signAlg(signAlg)
      .did(signature, issueChallenge, publicId);
    const { custom } = fromIssueChallenge(issueChallenge);
    const accessToken = await this.gitHubService.getAccessToken(code);
    const gitHubUser = await this.gitHubService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const vc = await getGitHubAccOwnVC(
      this.didService.id,
      subjectDID,
      gitHubUser,
      custom
    );
    return this.proofService.jwsSing(vc);
  }

  getProvidedVC(): VCType {
    return VCType.GitHubAccount;
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
