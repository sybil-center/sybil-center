import { Challenge, ChallengeReq, Credential, IssueReq, Options, SignFn } from "../../base/types/index.js";
import { AnyObj } from "../../util/types.util.js";

export type EthAccountChallengeReq = ChallengeReq

export type EthAccountChallenge = Challenge & {
  ownerChallenge: string;
}

export type EthAccountReq = Omit<EthAccountChallenge, "ownerChallenge">

export type EthAccountIssueReq = IssueReq & {
  publicId: string;
}

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
  ownerProofFn?: SignFn;
}

export type OwnerProofEthAccount = {
  sessionId: string;
  signature: string;
  publicId: string;
}

export type EthAccountProofResp = {
  address: string;
}
