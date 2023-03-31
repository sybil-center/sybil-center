import { ChallengeReq, Credential, IssueReq, Options, SignFn } from "../base/index.js";

export interface EthAccountChallengeReq extends ChallengeReq {}

export interface EthAccountChallenge {
  sessionId: string;
  issueChallenge: string;
  ownerChallenge: string;
}

export type EthAccountReq = Omit<EthAccountChallenge, "ownerChallenge">

export interface EthAccountIssueReq extends IssueReq {
  sessionId: string;
  signature: string;
  publicId: string;
  signAlg?: string;
}

export interface EthAccountVC extends Credential {}

export interface EthAccountOptions extends Options {
  ownerProofFn?: SignFn;
}

export interface OwnerProofEthAccount {
  sessionId: string;
  signature: string;
  publicId: string;
}

export interface EthAccountProofResp {
  ethereumAddress: string;
}
