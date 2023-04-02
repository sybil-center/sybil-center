import { ICredentialProvider } from "../../base/credential-provider.type.js";
import { HttpClient } from "../../base/http-client.js";
import type { SignFn } from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import {
  TwitterAccountChallenge as Challenge,
  TwitterAccountChallengeReq as ChallengeReq,
  TwitterAccountIssueReq,
  TwitterAccountReq,
  TwitterAccountVC
} from "./types.js";

export class TwitterAccountProvider
  implements ICredentialProvider<ChallengeReq, Challenge, TwitterAccountReq, TwitterAccountVC> {

  readonly kind: CredentialType = "TwitterAccount";

  constructor(private readonly httpClient: HttpClient) {}

  getPayload(payloadRequest: ChallengeReq): Promise<Challenge> {
    return this.httpClient.payload(this.kind, payloadRequest);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  /**
   * Make request to issuer to issue VC
   * @param signFn algorithm for sign message
   * @param sessionId id of session
   * @param issueChallenge message which will be signed
   */
  async issueVC(
    signFn: SignFn,
    { sessionId, issueChallenge }: TwitterAccountReq
  ): Promise<TwitterAccountVC> {
    const {
      signature,
      publicId,
      signAlg
    } = await signFn({ message: issueChallenge });
    return this.httpClient.issue<TwitterAccountVC, TwitterAccountIssueReq>(this.kind, {
      sessionId: sessionId,
      signature: signature,
      signAlg: signAlg,
      publicId: publicId
    });
  }
}
