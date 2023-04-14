import type { IssueReq, SubjectProof } from "../types/index.js";

export interface Issuer<
  TCredential,
  TOptions,
  TChallengeReq,
  TChallenge,
  TIssueReq = IssueReq
> {
  issueCredential(subjectProof: SubjectProof, options?: TOptions): Promise<TCredential>;
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  canIssue(sessionId: string): Promise<boolean>;
  issue(issueReq: TIssueReq): Promise<TCredential>
}
