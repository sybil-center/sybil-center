import type { SignFn } from "../types/index.js";

export interface ICredentialProvider<TChallengeReq, TChallenge, TCredentialReq, TCredential> {
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  canIssue(sessionId: string): Promise<boolean>;
  issueVC(signFn: SignFn, credentialReq: TCredentialReq): Promise<TCredential>;
}
