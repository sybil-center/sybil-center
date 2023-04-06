import { Challenge, ChallengeReq, Credential, IssueReq, Options, SubjectProof } from "../../base/types/index.js";
import { AnyObj } from "../../util/types.util.js";

export type EthAccountChallengeReq = ChallengeReq & {
  ethAddress?: string;
}

export type EthAccountChallenge = Challenge & {
  ownerChallenge?: string;
}

export type EthAccountReq = Omit<EthAccountChallenge, "ownerChallenge">

export type EthAccountIssueReq = IssueReq

export type EthAccountVC = Credential & {
  credentialSubject: {
    id: string;
    ethereum: {
      address: string;
      chainId: string;
    }
    custom?: AnyObj;
  };
}

export type EthAccountOptions = Options & {
  ethOwnerProof?: SubjectProof;
}

export type OwnerProofEthAccount = {
  sessionId: string;
  signature: string;
}

export type EthAccountProofResp = {
  address: string;
}
