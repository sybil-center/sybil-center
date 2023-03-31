import { IssueReq, Credential, ChallengeReq, Options } from "../base/index.js";
import { SignAlgAlias } from "../base/index.js";

export interface TwitterAccountChallengeReq extends ChallengeReq {
  redirectUrl?: string;
}

export interface TwitterAccountChallenge {
  authUrl: string;
  sessionId: string;
  issueChallenge: string;
}

export interface TwitterAccountReq {
  sessionId: string;
  issueChallenge: string;
}

export interface TwitterAccountIssueReq extends IssueReq {
  sessionId: string;
  signature: string;
  signAlg?: SignAlgAlias;
  publicId: string;
}

export interface TwitterAccountVC extends Credential {
  credentialSubject: {
    id: string;
    twitter: {
      id: string;
      username: string;
    }
    custom?: { [key: string]: any }
  };
}

export interface TwitterAccountOptions extends Options {
  redirectUrl?: string;
  windowFeatures?: string;
}
