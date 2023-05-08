import type {
  Challenge,
  ChallengeReq,
  Credential,
  IssueReq,
  Options,
  SubjectProof
} from "../types/index.js";

export interface Issuer<
  TCredential = Credential,
  TOptions = Options,
  TChallengeReq = ChallengeReq,
  TChallenge = Challenge,
  TIssueReq = IssueReq
> {
  /**
   * Aggregates {@link getChallenge},  {@link canIssue}, {@link issue},
   * to provides issue credential process and returns `credential`.
   * @param subjectProof - object contains `subjectId` and `signFn`
   * @param options - influence on result `credential` or issue process
   */
  issueCredential(subjectProof: SubjectProof, options?: TOptions): Promise<TCredential>;
  /**
   * Sends challengeReq to receive appropriate challenge request.
   * Challenge contains `sessionId` and `issueMessage` fields, which are required
   * @param challengeReq - entity that contains data to receive appropriate challenge
   */
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  /**
   * Method used to check the status of the application to issue credential
   * @param sessionId - session identifier
   */
  canIssue(sessionId: string): Promise<boolean>;
  /**
   * Sends issueReq and receive credential
   * @param issueReq - contains `sessionId` and `signature`.
   *                   `signature` creates from `challenge.issueMessage`
   */
  issue(issueReq: TIssueReq): Promise<TCredential>;
}
