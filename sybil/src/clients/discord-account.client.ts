import type { IClient } from "./client.type.js";
import { DiscordAccountProvider } from "../providers/discord-account.provider.js";
import { HttpClient } from "../util/http-client.js";
import type { SignFn } from "../types/index.js";
import { DiscordAccountOptions, DiscordAccountVC } from "../types/index.js";
import { popupFeatures } from "../util/view.js";
import { repeatUntil } from "../util/repeat-until.js";

export class DiscordAccountClient
  implements IClient<DiscordAccountVC, DiscordAccountOptions> {

  constructor(
    httpClient: HttpClient,
    private readonly provider = new DiscordAccountProvider(httpClient)
  ) {}

  async issueCredential(
    signFn: SignFn,
    opt?: DiscordAccountOptions
  ): Promise<DiscordAccountVC> {
    const payload = await this.provider.getPayload({
      redirectUrl: opt?.redirectUrl,
      custom: opt?.custom
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
