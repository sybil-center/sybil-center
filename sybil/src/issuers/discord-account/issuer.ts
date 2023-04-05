import type { Issuer } from "../../base/issuer.type.js";
import { DiscordAccountProvider } from "./povider.js";
import { HttpClient } from "../../base/http-client.js";
import type { SubjectProof } from "../../types/index.js";
import { DiscordAccountOptions, DiscordAccountVC } from "./types.js";
import { popupFeatures } from "../../util/view.util.js";
import { repeatUntil } from "../../util/repeat.until.js";

export class DiscordAccountIssuer
  implements Issuer<DiscordAccountVC, DiscordAccountOptions> {

  constructor(
    httpClient: HttpClient,
    private readonly provider = new DiscordAccountProvider(httpClient)
  ) {}

  async issueCredential(
    { publicId, signFn }: SubjectProof,
    opt?: DiscordAccountOptions
  ): Promise<DiscordAccountVC> {
    const payload = await this.provider.getChallenge({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      publicId: publicId,
    });
    const popup = window.open(
      payload.authUrl,
      "_blank",
      opt?.windowFeature ? opt?.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Discord`);
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
