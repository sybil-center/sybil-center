import { ZkcId, ZkCredProofed } from "./zkc.credential.js";

export const zkcIdAliases = ["mina", "1"] as const;

export type ZkcIdAlias = typeof zkcIdAliases[number]

export type ZkcChallengeReq = {
  exd?: number;
  sbjId: Omit<ZkcId, "t"> & { t: ZkcIdAlias };
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
  issue(issueReq: TZkcIssueReq): Promise<ZkCredProofed>;
  providedSchema: number;
}