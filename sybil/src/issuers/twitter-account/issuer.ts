import type { Issuer } from "../../base/issuer.type.js";
import { HttpClient } from "../../base/http-client.js";
import type {
  SubjectProof,
  TwitterAccountChallenge,
  TwitterAccountChallengeReq,
  TwitterAccountIssueReq
} from "../../types/index.js";
import { popupFeatures } from "../../util/view.util.js";
import { repeatUntil } from "../../util/repeat.until.js";
import { TwitterAccountOptions, TwitterAccountVC } from "./types.js";
import { CredentialType } from "../../types/index.js";

export class TwitterAccountIssuer
  implements Issuer<
    TwitterAccountVC,
    TwitterAccountOptions,
    TwitterAccountChallengeReq,
    TwitterAccountChallenge,
    TwitterAccountIssueReq
  > {

  readonly kind: CredentialType = "TwitterAccount";

  constructor(
    private readonly httpClient: HttpClient,
  ) {}

  async issueCredential(
    { subjectId, signFn }: SubjectProof,
    opt?: TwitterAccountOptions
  ): Promise<TwitterAccountVC> {
    const challenge = await this.getChallenge({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      subjectId: subjectId,
      props: opt?.props
    });
    const popup = window.open(
      challenge.authUrl,
      "_blank",
      opt?.windowFeatures ? opt?.windowFeatures : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Twitter`);
    const result = await repeatUntil<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      () => this.canIssue(challenge.sessionId)
    );
    if (result instanceof Error) throw result;
    const signature = await signFn({ message: challenge.issueMessage });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature,
    });
  }

  async getChallenge(
    challengeReq: TwitterAccountChallengeReq
  ): Promise<TwitterAccountChallenge> {
    return this.httpClient.challenge(this.kind, challengeReq);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  issue(issueReq: TwitterAccountIssueReq): Promise<TwitterAccountVC> {
    return this.httpClient.issue<
      TwitterAccountVC,
      TwitterAccountIssueReq
    >(this.kind, issueReq)
  }


}
