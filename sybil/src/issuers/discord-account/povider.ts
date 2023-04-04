import { ICredentialProvider } from "../../base/credential-provider.type.js";
import { HttpClient } from "../../base/http-client.js";
import type { SignFn } from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import {
  DiscordAccountChallenge as Challenge,
  DiscordAccountChallengeReq as ChallengeReq,
  DiscordAccountIssueReq,
  DiscordAccountReq,
  DiscordAccountVC
} from "./types.js";

export class DiscordAccountProvider
  implements ICredentialProvider<ChallengeReq, Challenge, DiscordAccountReq, DiscordAccountVC> {

  readonly kind: CredentialType = "DiscordAccount";

  constructor(private readonly httpClient: HttpClient) {}

  getPayload(payloadRequest: ChallengeReq): Promise<Challenge> {
    return this.httpClient.payload<Challenge, ChallengeReq>(this.kind, payloadRequest);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  async issueVC(signFn: SignFn, { issueChallenge, sessionId }: DiscordAccountReq): Promise<DiscordAccountVC> {
    console.log("issue challenge",issueChallenge);
    const {
      publicId,
      signType,
      signature
    } = await signFn({ message: issueChallenge });
    return this.httpClient.issue<DiscordAccountVC, DiscordAccountIssueReq>(this.kind, {
      sessionId: sessionId,
      signature: signature,
      publicId: publicId,
      signType: signType
    });
  }
}
