import { Proved, ZkcId, ZkCred, ZkcSchemaNums } from "./zkc.credential.js";

export const ZKC_ID_TYPE_ALIASES = ["mina", 0, "eth", 1] as const;

export type ZkcIdTypeAlias = typeof ZKC_ID_TYPE_ALIASES[number]

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

export interface IssuerTypes {
  ChallengeReq: ZkcChallengeReq;
  Challenge: ZkcChallenge;
  IssueReq: ZkcIssueReq;
  Cred: Proved<ZkCred>;
  CanIssueReq: ZkcCanIssueReq;
  CanIssueResp: ZkcCanIssueResp;
}

export interface IZkcIssuer<T extends IssuerTypes = IssuerTypes> {
  getChallenge(challengeReq: T["ChallengeReq"]): Promise<T["Challenge"]>;
  canIssue(entry: T["CanIssueReq"]): Promise<T["CanIssueResp"]>;
  issue(issueReq: T["IssueReq"]): Promise<T["Cred"]>;
  providedSchema: ZkcSchemaNums;
}

// export interface IZkcIssuer2<{
// }>
