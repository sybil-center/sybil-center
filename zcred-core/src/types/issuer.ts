import { HttpCredential, Identifier } from "./zk-credentials.js";
import { SignFn } from "./wallet-adapter.js";

export type ChallengeOptions = {
  /** Chain id according CAIP-2 */
  chainId?: string;
  /** Redirect URL after issuing or authorization */
  redirectURL?: string;
}

export type ChallengeReq = {
  subject: {
    /** Credential subject identifier */
    id: Identifier;
  }
  /** Date when credential becomes valid */
  validFrom?: string;
  /** Date when credential becomes not valid */
  validUntil?: string;
  options?: ChallengeOptions
}

export type Challenge = {
  /** Issuing session unique identifier */
  sessionId: string;
  /** Message for signing */
  message: string;
  /** Verification URL */
  verifyURL?: string;
}

export type CanIssueReq = {
  /** Issuing session unique identifier */
  sessionId: string;
}

export type CanIssue = {
  canIssue: boolean
}

export type IssueReq = {
  /** Issuing session unique identifier */
  sessionId: string;
  /** Signature from Challenge message */
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

export type Info = {
  /** kid for credential JWS verification */
  kid: string;
  /** Credential type */
  credentialType: string;
  /** If true Issuer MUST provide update proofs method */
  updatableProofs: boolean;
  /** ISO date when new proof types was added to credential */
  proofsUpdated: string;
  /** Proofs information */
  proofsInfo: {
    /** Proof type */
    type: string;
    /** References to proof */
    references: string[]
  }[]
}

// export type ChangeSubjectIdReq<TCred extends HttpCredential = HttpCredential> = {
//   newSubjectId: Identifier;
//   credential: TCred
// }

/** Http issuer interface */
export interface IHttpIssuer {
  /** Issuer endpoint */
  uri: URL;
  /** Info method */
  getInfo(): Promise<Info>;
  /** Challenge method */
  getChallenge(challengeReq: ChallengeReq): Promise<Challenge>;
  /** Can issue method */
  canIssue(canIssueReq: CanIssueReq): Promise<CanIssue>;
  /** Issue method */
  issue<
    TCred extends HttpCredential = HttpCredential
  >(issueReq: IssueReq): Promise<TCred>;
  /** Update proofs method */
  updateProofs?<
    TCred extends HttpCredential = HttpCredential
  >(cred: TCred): Promise<TCred>;
  /** Change subject id method */
  browserIssue?<
    TCred extends HttpCredential = HttpCredential
  >(args: BrowserIssueParams): Promise<TCred>;
}