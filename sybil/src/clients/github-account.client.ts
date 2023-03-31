import type { IClient } from "./client.type.js";
import { GithubAccountProvider } from "../providers/github-account.provider.js";
import { HttpClient } from "../util/http-client.js";
import type { SignFn } from "../types/index.js";
import { GitHubAccountOptions, GitHubAccountVC } from "../types/index.js";
import { popupFeatures } from "../util/view.js";
import { repeatUntil } from "../util/repeat-until.js";

export class GithubAccountClient
  implements IClient<GitHubAccountVC, GitHubAccountOptions> {

  constructor(
    httpClient: HttpClient,
    private readonly provider = new GithubAccountProvider(httpClient)
  ) {}

  async issueCredential(
    signFn: SignFn,
    opt?: GitHubAccountOptions
  ): Promise<GitHubAccountVC> {
    const payload = await this.provider.getPayload({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom
    });
    const popup = window.open(
      payload.authUrl,
      "_blank",
      opt?.windowFeature ? opt?.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in GitHub`);
    const result = await repeatUntil<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      () => this.provider.canIssue(payload.sessionId)
    );
    if (result instanceof Error) throw result;
    return this.provider.issueVC(signFn, {
      sessionId: payload.sessionId,
      issueChallenge: payload.issueChallenge
    });
  }
}
