import { ICredentialProvider } from "../../base/credential-provider.type.js";
import { HttpClient } from "../../base/http-client.js";
import type { SignFn } from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import {
  GitHubAccountChallenge as Challenge,
  GitHubAccountChallengeReq as ChallengeReq,
  GitHubAccountIssueReq,
  GitHubAccountReq,
  GitHubAccountVC
} from "./types.js";

export class GithubAccountProvider
  implements ICredentialProvider<ChallengeReq, Challenge, GitHubAccountReq, GitHubAccountVC> {
  readonly kind: CredentialType = "GitHubAccount";

  constructor(private readonly httpClient: HttpClient) {}

  getPayload(payloadRequest: ChallengeReq): Promise<Challenge> {
    return this.httpClient.payload(this.kind, payloadRequest);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  async issueVC(signFn: SignFn, { sessionId, issueChallenge }: GitHubAccountReq): Promise<GitHubAccountVC> {
    const {
      signType,
      publicId,
      signature
    } = await signFn({ message: issueChallenge });
    return this.httpClient.issue<GitHubAccountVC, GitHubAccountIssueReq>(this.kind, {
      sessionId: sessionId,
      signature: signature,
      signType: signType,
      publicId: publicId
    });
  }
}
