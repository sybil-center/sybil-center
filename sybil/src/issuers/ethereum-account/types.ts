import { Challenge, ChallengeReq, Credential, IssueReq, Options } from "../../base/types/index.js";
import { AnyObj } from "../../util/types.util.js";

export type EthAccountChallengeReq = ChallengeReq

export type EthAccountChallenge = Challenge

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

export type EthAccountOptions = Options
