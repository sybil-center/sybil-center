import { ProofType } from "./proof-type.type.js";
import { CredentialType } from "./credential-type.type.js";
import { AnyObj } from "../../util/types.util.js";
import { SignFn } from "./sign-fn.type.js";

/** Base type of VC and its components */
export type Credential = {

  /** JSON-LD context */
  "@context": string[];

  /** Types of VCs */
  type: CredentialType[];

  /** VC ID (DID, http URL e.t.c) */
  id?: string;

  /** Entity that issued the VC (DID, http URL e.t.c) */
  issuer: { id: string };

  /**  Issuance date of VC */
  issuanceDate: Date;

  /** Expiration date */
  expirationDate?: Date;

  /** Contains claims about subject */
  credentialSubject?: CredentialSubject;

  credentialStatus?: CredentialStatus;

  /** Proof. This field add */
  proof?: Proof;
}

export type CredentialSubject = {
  id: string;
  custom?: { [key: string]: any }
};

export type Proof = {
  type?: ProofType;

  /** Date as string (date format depends on implementation) */
  created?: Date;
  proofPurpose?: string;
  verificationMethod?: string;
  proofValue?: string;
  jws?: string;
}

export type CredentialStatus = {
  id: string;
}

/** Base type for VC requests */
export type IssueReq = {
  sessionId: string;
  signature: string;
}

/** For check is credential ready for issue */
export type CanIssueReq = {
  /** Session id */
  sessionId: string;
}

/** Response on "can issue" request */
export type CanIssueResp = {
  /** If true - VC can be issued, else - otherwise */
  canIssue: boolean;
}

export type Challenge = {
  sessionId: string;
  issueChallenge: string;
}

/** Request entity for getting challenge */
export type ChallengeReq = {
  /** Custom property that will be represented in Verifiable Credential */
  custom?: AnyObj;
  /** Credential expiration date */
  expirationDate?: Date;
  /** Verifiable credential id */
  credentialId?: string;
  /** Chain address refer to credential subject */
  subjectId: string;
}

export type Options = {
  custom?: AnyObj;
  expirationDate?: Date;
  credentialId?: string;
}

export type SubjectProof = {
  subjectId: string;
  signFn: SignFn;
}

export type VerifyResult = {
  isVerified: boolean
}

export type APIKeys = {
  apiKey: string;
  secretKey: string;
}
