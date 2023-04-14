import type { Issuer } from "../../base/issuer.type.js";
import { HttpClient } from "../../base/http-client.js";
import type {
  GitHubAccountChallenge,
  GitHubAccountChallengeReq,
  GitHubAccountIssueReq,
  SubjectProof
} from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import { GitHubAccountOptions, GitHubAccountVC } from "./types.js";
import { popupFeatures } from "../../util/view.util.js";
import { repeatUntil } from "../../util/repeat.until.js";

export class GithubAccountIssuer
  implements Issuer<
    GitHubAccountVC,
    GitHubAccountOptions,
    GitHubAccountChallengeReq,
    GitHubAccountChallenge,
    GitHubAccountIssueReq
  > {
  readonly kind: CredentialType = "GitHubAccount";

  constructor(
    private readonly httpClient: HttpClient,
  ) {}

  async issueCredential(
    { publicId, signFn }: SubjectProof,
    opt?: GitHubAccountOptions
  ): Promise<GitHubAccountVC> {
    const challenge = await this.getChallenge({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      publicId: publicId
    });
    const popup = window.open(
      challenge.authUrl,
      "_blank",
      opt?.windowFeature ? opt?.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in GitHub`);
    const result = await repeatUntil<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      () => this.canIssue(challenge.sessionId)
    );
    if (result instanceof Error) throw result;
    const {
      signature,
      signType
    } = await signFn({ message: challenge.issueChallenge });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature,
      signType: signType
    });
  }

  getChallenge(challengeReq: GitHubAccountChallengeReq): Promise<GitHubAccountChallenge> {
    return this.httpClient.challenge(this.kind, challengeReq);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  issue(issueReq: GitHubAccountIssueReq): Promise<GitHubAccountVC> {
    return this.httpClient.issue(this.kind, issueReq);
  }
}
