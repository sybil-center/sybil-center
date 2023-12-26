import { Identifier, ZkCredential } from "./zk-credentials.js";
import { SignFn } from "./wallet-adapter.js";

export type ChallengeOptions = {
  chainId?: string;
  redirectURL?: string;
}

export type ChallengeReq = {
  subject: {
    id: Identifier;
  }
  validFrom?: string;
  validUntil?: string;
  options?: ChallengeOptions
}

export type Challenge = {
  sessionId: string;
  message: string;
  verifyURL?: string;
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

export type BrowserIssueParams = {
  challengeReq: ChallengeReq;
  sign: SignFn;
  windowOptions?: WindowOptions;
}

// export type ProofInfo = {
//   type: string;
//   reference: string;
//   description?: string;
//   schemasInfo: {
//     description: string;
//     attributesSchema: TrSchema
//   }[]
// }

// export type IssuerInfo = {
//   proofsInfo: ProofInfo[];
//   updatable: boolean;
//   updated: string;
//   endpoint: string;
//   description: string;
// }

export interface IHttpIssuer {
  endpoint: URL;
  credentialType: string;
  // getInfo(): Promise<IssuerInfo>;
  browserIssue?<
    TCred extends ZkCredential = ZkCredential
  >(args: BrowserIssueParams): Promise<TCred>;
  getChallenge(challengeReq: ChallengeReq): Promise<Challenge>;
  canIssue(canIssueReq: CanIssueReq): Promise<CanIssue>;
  issue<
    TCred extends ZkCredential = ZkCredential
  >(issueReq: IssueReq): Promise<TCred>;
}