import type { Issuer } from "../../base/issuer.type.js";
import {
  TwitterAccountProvider,
} from "./provider.js";
import { HttpClient } from "../../base/http-client.js";
import type { SignFn } from "../../types/index.js";
import { popupFeatures } from "../../util/view.util.js";
import { repeatUntil } from "../../util/repeat.until.js";
import { TwitterAccountVC, TwitterAccountOptions } from "./types.js";

export class TwitterAccountIssuer
  implements Issuer<TwitterAccountVC, TwitterAccountOptions> {

  constructor(
    httpClient: HttpClient,
    private readonly provider = new TwitterAccountProvider(httpClient)
  ) {}

  async issueCredential(
    signFn: SignFn,
    opt?: TwitterAccountOptions
  ): Promise<TwitterAccountVC> {
    const payload = await this.provider.getPayload({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom,
      expirationDate: opt?.expirationDate
    });
    const popup = window.open(
      payload.authUrl,
      "_blank",
      opt?.windowFeatures ? opt?.windowFeatures : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Twitter`);
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
