import type { Issuer } from "../../base/issuer.type.js";
import { HttpClient } from "../../base/http-client.js";
import type {
  EthAccountChallenge,
  EthAccountChallengeReq,
  EthAccountIssueReq,
  SubjectProof
} from "../../types/index.js";
import { CredentialType } from "../../types/index.js";
import { EthAccountOptions, EthAccountVC } from "./types.js";

export class EthAccountIssuer
  implements Issuer<
    EthAccountVC,
    EthAccountOptions,
    EthAccountChallengeReq,
    EthAccountChallenge,
    EthAccountIssueReq
  > {
  readonly kind: CredentialType = "EthereumAccount";

  constructor(private readonly httpClient: HttpClient) {
  }

  async issueCredential(
    { subjectId, signFn }: SubjectProof,
    opt?: EthAccountOptions
  ): Promise<EthAccountVC> {
    const challenge = await this.getChallenge({
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      subjectId: subjectId,
      props: opt?.props
    });
    const signature = await signFn({ message: challenge.issueMessage });
    return await this.issue({
      sessionId: challenge.sessionId,
      signature: signature,
    });
  }

  getChallenge(challengeReq: EthAccountChallengeReq): Promise<EthAccountChallenge> {
    return this.httpClient.challenge(this.kind, challengeReq);
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }

  issue(issueReq: EthAccountIssueReq): Promise<EthAccountVC> {
    return this.httpClient.issue(this.kind, issueReq)
  }


}
