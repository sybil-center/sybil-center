import { Proved, ZkcId, ZkcIdTypeAlias, ZkCred, ZkcSchemaNums } from "./credential.type.js";
import { WalletProof } from "./wallet-provider.type.js";

export type ZkcChallengeReq = {
  expirationDate?: number;
  subjectId: ZkcId;
  options?: {
    mina?: { network?: "mainnet" | "testnet" }
  }
}

export type Raw<
  T extends ZkcChallengeReq
> = Omit<T, "subjectId"> & {
  subjectId: Omit<ZkcId, "t"> & { t: ZkcIdTypeAlias }
}

export type ZkcChallenge = {
  sessionId: string;
  message: string;
}

export type ZkcCanIssueReq = {
  sessionId: string;
}

export type ZkcCanIssueResp = {
  canIssue: boolean
}

export type ZkcIssueReq = {
  sessionId: string;
  signature: string;
}

export type ZkcOptions = Omit<ZkcChallengeReq, "subjectId">

export type Option<
  T extends ZkcChallengeReq = ZkcChallengeReq
> = Omit<T, "subjectId">

export interface IssuerTypes {
  ChallengeReq: Raw<ZkcChallengeReq>;
  Challenge: ZkcChallenge;
  IssueReq: ZkcIssueReq;
  Cred: Proved<ZkCred>;
  CanIssueReq: ZkcCanIssueReq;
  CanIssueResp: ZkcCanIssueResp;
  Options: ZkcOptions;
}

export interface IZkcIssuer<T extends IssuerTypes = IssuerTypes> {
  issueCred(proof: WalletProof, options?: T["Options"]): Promise<T["Cred"]>;
  getChallenge(challengeReq: T["ChallengeReq"]): Promise<T["Challenge"]>;
  canIssue(entry: T["CanIssueReq"]): Promise<T["CanIssueResp"]>;
  issue(issueReq: T["IssueReq"]): Promise<T["Cred"]>;
  providedSchema: ZkcSchemaNums;
}
