import { ICredentialProvider, IOwnerProofProvider } from "../../base/credential-provider.type.js";
import { HttpClient } from "../../base/http-client.js";
import type {
  EthAccountChallengeReq as ChallengeReq, EthAccountProofResp,
  OwnerProofEthAccount,
  SignFn
} from "../../types/index.js";
import {
  CredentialType,
  EthAccountChallenge as Challenge,
  EthAccountIssueReq,
  EthAccountReq,
  EthAccountVC
} from "../../types/index.js";

/**
 * Ethereum account ownership VC provider
 */
export class EthAccountProvider
  implements
    ICredentialProvider<
    ChallengeReq,
    Challenge,
    EthAccountReq,
    EthAccountVC
  >,
    IOwnerProofProvider<EthAccountProofResp, Challenge, SignFn> {

  readonly kind: CredentialType = "EthereumAccount";

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Get payload for issuing VC.
   * Payload contains {@link EthAccountChallenge#message} that has to be signed by ETH wallet / account,
   * and {@link EthAccountChallenge#sessionId} that is id of message that has to be attached to
   * {@link EthAccountReq}
   * @throws Error
   */
  getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    return this.httpClient.challenge<Challenge, ChallengeReq>(
      this.kind, challengeReq
    );
  }

  canIssue(sessionId: string): Promise<boolean> {
    return this.httpClient.canIssue(this.kind, sessionId);
  }
  async ownerProof(proofAlg: SignFn, params: Challenge): Promise<EthAccountProofResp> {
    const {
      signature
    } = await proofAlg({ message: params.ownerChallenge! })
    return await this.httpClient.proof<
      EthAccountProofResp,
      OwnerProofEthAccount
    >("EthereumAccount", {
      signature: signature,
      sessionId: params.sessionId,
    })
  }

  /**
   * Execute all processes needed for issue VC
   * Better use this method for get VC.
   * It implements all needed functional for get "Ethereum account ownership VC" by the simplest way
   * @param params
   * @param signMessageAlg algorithm of signing message
   * @throws Error
   */
  async issueVC(signMessageAlg: SignFn, params: EthAccountReq): Promise<EthAccountVC> {
    const {
      signature,
      signType
    } = await signMessageAlg({ message: params.issueChallenge });
    return this.httpClient.issue<EthAccountVC, EthAccountIssueReq>(this.kind, {
      sessionId: params.sessionId,
      signature: signature,
      signType: signType
    });
  }
}
