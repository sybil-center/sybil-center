import { SignAlgAlias, ChallengeReq, Credential, IssueReq, Options } from "../base/index.js";

export interface GitHubAccountChallengeReq extends ChallengeReq {
  redirectUrl?: string;
}

export interface GitHubAccountChallenge {
  authUrl: string;
  sessionId: string;
  issueChallenge: string;
}

export interface GitHubAccountReq {
  sessionId: string;
  issueChallenge: string;
}

export interface GitHubAccountIssueReq extends IssueReq {
  sessionId: string;
  signature: string;
  signAlg?: SignAlgAlias;
  publicId: string;
}

export interface GitHubAccountVC extends Credential {
  credentialSubject: {
    id: string;
    github: {
      id: number;
      username: string;
      userPage: string;
    };
    custom?: { [key: string]: any }
  };
}

export interface GitHubAccountOptions extends Options {
  redirectUrl?: string;
  windowFeature?: string;
}
