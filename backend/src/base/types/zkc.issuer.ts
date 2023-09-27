import { ZkcId, ZkCredProved, ZkcSchemaNums } from "./zkc.credential.js";

export const ZKC_ID_TYPE_ALIASES = ["mina", 0] as const;

export type ZkcIdTypeAlias = typeof ZKC_ID_TYPE_ALIASES[number]

export type ZkcChallengeReq = {
  expirationDate?: number;
  subjectId: ZkcId;
  options?: Record<string, any>
}

export type Raw<
  T extends ZkcChallengeReq
> = Omit<T, "subjectId"> & {
  subjectId: Omit<ZkcId, "t"> & { t: ZkcIdTypeAlias}
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

export interface IZkcIssuer<
  TChallengeReq extends ZkcChallengeReq = ZkcChallengeReq,
  TChallenge extends ZkcChallenge = ZkcChallenge,
  TZkcIssueReq extends ZkcIssueReq = ZkcIssueReq,
  TCanReq extends ZkcCanIssueReq = ZkcCanIssueReq,
  TCanResp extends ZkcCanIssueResp = ZkcCanIssueResp
> {
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  canIssue(entry: TCanReq): Promise<TCanResp>;
  issue(issueReq: TZkcIssueReq): Promise<ZkCredProved>;
  providedSchema: ZkcSchemaNums;
}
