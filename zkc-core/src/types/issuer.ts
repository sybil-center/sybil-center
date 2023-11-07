import { ZkcID, ZkCred } from "./cred.js";
import { WalletProof } from "./wallet-provider.js";

export type ChallengeReq = {
  subjectId: ZkcID;
  options?: {
    expirationDate?: number;
  }
}

export type Challenge = {
  sessionId: string;
  message: string;
}

export type CanIssueReq = {
  sessionId: string;
}

export type CanIssueResp = {
  canIssue: boolean;
}

export type IssueReq = {
  sessionId: string;
  signature: string;
}

export interface IssuerTypes {
  ChallengeReq: ChallengeReq;
  Challenge: Challenge;
  CanIssueReq: CanIssueReq;
  CanIssueResp: CanIssueResp;
  IssueReq: IssueReq;
  Cred: ZkCred;
  Options: ChallengeReq["options"];
}

export interface IZkcIssuer<T extends IssuerTypes = IssuerTypes> {
  issueCred?(args: {
    proof: WalletProof;
    options?: T["Options"];
  }): Promise<T["Cred"]>;
  getChallenge(challengeReq: T["ChallengeReq"]): Promise<T["Challenge"]>;
  canIssue(entry: T["CanIssueReq"]): Promise<T["CanIssueResp"]>;
  issue(issueReq: T["IssueReq"]): Promise<T["Cred"]>;
  providedSchema: number;
}