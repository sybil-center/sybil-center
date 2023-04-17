import type { Issuer } from "../../base/issuer.type.js";
import { HttpClient } from "../../base/http-client.js";
import type {
  DiscordAccountChallenge,
  DiscordAccountChallengeReq,
  DiscordAccountIssueReq,
  SubjectProof
} from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import { DiscordAccountOptions, DiscordAccountVC } from "./types.js";
import { popupFeatures } from "../../util/view.util.js";
import { repeatUntil } from "../../util/repeat.until.js";

export class DiscordAccountIssuer
  implements Issuer<
    DiscordAccountVC,
    DiscordAccountOptions,
    DiscordAccountChallengeReq,
    DiscordAccountChallenge,
    DiscordAccountIssueReq
  > {

  readonly kind: CredentialType = "DiscordAccount";

  constructor(
    readonly httpClient: HttpClient,
  ) {}

  async issueCredential(
    { publicId, signFn }: SubjectProof,
    opt?: DiscordAccountOptions
  ): Promise<DiscordAccountVC> {
    const challenge = await this.getChallenge({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      props: opt?.props,
      publicId: publicId,
    });
    const popup = window.open(
      challenge.authUrl,
      "_blank",
      opt?.windowFeature ? opt?.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Discord`);
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

  getChallenge(
    challengeReq: DiscordAccountChallengeReq
  ): Promise<DiscordAccountChallenge> {
    return this.httpClient.challenge(this.kind, challengeReq);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  issue(issueReq: DiscordAccountIssueReq): Promise<DiscordAccountVC> {
    return this.httpClient.issue<
      DiscordAccountVC,
      DiscordAccountIssueReq
    >(this.kind, issueReq);
  }
}
