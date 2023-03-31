import type { ProofType } from "@sybil-center/sdk";
import { VCType } from "./model/const/vc-type.js";
import type { OAuthState } from "./oauth.js";
import { SignAlgAlias } from "./service/multi-sign.service.js";

export const DEFAULT_CREDENTIAL_CONTEXT =
  "https://www.w3.org/2018/credentials/v1";
export const DEFAULT_CREDENTIAL_TYPE = VCType.VerifiableCredential;

/**
 * Base interface of VC and its components
 */
export interface VC {
  /**
   * JSON-LD context
   */
  "@context": string[];

  /**
   * Types of VCs
   */
  type: string[];

  /**
   * VC ID (DID, http URL e.t.c)
   */
  id?: string;

  /**
   * Entity that issued the VC (DID, http URL e.t.c)
   */
  issuer: { id: string };

  /**
   * Issuance date of VC
   */
  issuanceDate: Date;

  /**
   * Expiration date
   */
  expirationDate?: Date;

  /**
   * Contains claims about subject
   */
  credentialSubject?: CredentialSubject;

  credentialStatus?: CredentialStatus;

  /**
   * Proof. This field add in {@link ProofService}
   */
  proof?: Proof;
}

export type CredentialSubject = {
  id: string;
  custom?: { [key: string]: any };
};

export interface Proof {
  type?: ProofType;

  /**
   * Date as string (date format depends on implementation)
   */
  created?: string;
  proofPurpose?: string;
  verificationMethod?: string;
  proofValue?: string;
  jws?: string;
}

export interface CredentialStatus {
  id: string;
}

/**
 * Entity for check issue vc flow status
 */
export interface CanIssueReq {
  /**
   * Session id
   */
  sessionId: string;
}

export interface CanIssueRes {
  /**
   * If true - VC can be issued,
   * else - otherwise
   */
  canIssue: boolean;
}

export interface OAuthQueryCallBack {
  code: string;
  state: string;
}

/**
 * Generate Verifiable Credentials
 * Each service HAVE TO implement this interface if it creates VC
 */
export interface ICredentialIssuer<
  TCredentialReq,
  TCredential,
  TChallengeReq,
  TChallenge,
  TCanReq,
  TCanRes
> {
  issue(vcRequest: TCredentialReq): Promise<TCredential>;
  canIssue(entry: TCanReq): Promise<TCanRes>;
  getChallenge(challengeRequest: TChallengeReq): Promise<TChallenge>;
  getProvidedVC(): VCType;
}

export interface IOAuthCallback {
  handleOAuthCallback(code: string, state: OAuthState): Promise<URL | undefined>;
}

export interface ICallbackHandler<TEntry> {
  handleCallback(entry: TEntry): Promise<URL | undefined>;
}

export type SignResult = {
  /**
   * As base64 string
   */
  signature: string;

  /**
   * Blockchain address in human-readable format or public key as base64
   */
  publicId: string;

  /**
   * Blockchain id according to
   * {@see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md}
   * it also can be used with "did:pkh:" prefix
   */
  signAlg?: SignAlgAlias;
}

export interface ChainOwnerProof extends SignResult {
  sessionId: string;
}

export interface IOwnerProofHandler<TOwnerProof, TProofResult> {
  handleOwnerProof(proof: TOwnerProof): Promise<TProofResult>;
}
