import type { OAuthState } from "../types/oauth.js";
import {
  CanIssueReq,
  CanIssueResp,
  Challenge,
  ChallengeReq,
  Credential,
  CredentialType,
  IssueReq,
  SignResult
} from "@sybil-center/sdk/types";

export const DEFAULT_CREDENTIAL_CONTEXT =
  "https://www.w3.org/2018/credentials/v1";
export const DEFAULT_CREDENTIAL_TYPE: CredentialType = "VerifiableCredential";

export interface OAuthQueryCallBack {
  code: string;
  state: string;
}

/**
 * Generate Verifiable Credentials
 * Each service HAVE TO implement this interface if it creates VC
 */
export interface ICredentialIssuer<
  TCredentialReq extends IssueReq,
  TCredential extends Credential,
  TChallengeReq extends ChallengeReq,
  TChallenge extends Challenge,
  TCanReq = CanIssueReq,
  TCanRes = CanIssueResp
> {
  issue(vcRequest: TCredentialReq): Promise<TCredential>;
  canIssue(entry: TCanReq): Promise<TCanRes>;
  getChallenge(challengeRequest?: TChallengeReq): Promise<TChallenge>;
  providedCredential: CredentialType;
}

export interface IOAuthCallback {
  handleOAuthCallback(code: string, state: OAuthState): Promise<URL | undefined>;
}

export interface ChainOwnerProof extends SignResult {
  sessionId: string;
}

export interface IOwnerProofHandler<TOwnerProof, TProofResult> {
  handleOwnerProof(proof: TOwnerProof): Promise<TProofResult>;
}
