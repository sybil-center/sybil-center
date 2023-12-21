import { Identifier, ZkCredential } from "./zk-credentials.js";
import { SignFn } from "./wallet-adapter.js";

export type ChallengeReq = {
  subject: {
    id: Identifier;
  }
  validFrom?: string;
  validUntil?: string;
  options?: {
    chainId?: string
  }
}

export type Challenge = {
  sessionId: string;
  message: string;
  redirectURL?: string;
}

export type CanIssueReq = {
  sessionId: string;
}

export type CanIssue = {
  canIssue: boolean
}

export type IssueReq = {
  sessionId: string;
  signature: string;
}

export type WindowOptions = {
  feature?: string;
  target?: string;
}

export type IssueCredArgs = {
  challengeReq: ChallengeReq;
  sign: SignFn;
  windowOptions?: WindowOptions;
}

export interface IHttpIssuer {
  endpoint: URL;
  credentialType: string;
  issueCredential<
    TCred extends ZkCredential = ZkCredential
  >(args: IssueCredArgs): Promise<TCred>;
  getChallenge(challengeReq: ChallengeReq): Promise<Challenge>;
  canIssue(canIssueReq: CanIssueReq): Promise<CanIssue>;
  issue<
    TCred extends ZkCredential = ZkCredential
  >(issueReq: IssueReq): Promise<TCred>;
}