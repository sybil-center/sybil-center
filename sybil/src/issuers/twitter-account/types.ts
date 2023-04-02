import { Challenge, ChallengeReq, Credential, IssueReq, Options } from "../../base/types/index.js";

export type TwitterAccountChallengeReq = ChallengeReq & {
  redirectUrl?: string;
}

export type TwitterAccountChallenge = Challenge & {
  authUrl: string;
}

export type TwitterAccountReq = {
  sessionId: string;
  issueChallenge: string;
}

export type TwitterAccountIssueReq = IssueReq & {
  publicId: string;
}

export type TwitterAccountVC = Credential & {
  credentialSubject: {
    id: string;
    twitter: {
      id: string;
      username: string;
    }
    custom?: { [key: string]: any }
  };
}

export type TwitterAccountOptions = Options & {
  redirectUrl?: string;
  windowFeatures?: string;
}
