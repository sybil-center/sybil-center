import { ChallengeReq, Credential, IssueReq, Options, Challenge } from "../../base/types/index.js";

export type GitHubAccountChallengeReq = ChallengeReq & {
  redirectUrl?: string;
}

export type GitHubAccountChallenge = Challenge & {
  authUrl: string;
}

export type GitHubAccountReq =  {
  sessionId: string;
  issueChallenge: string;
}

export type GitHubAccountIssueReq = IssueReq & {
  publicId: string;
}

export type GitHubAccountVC = Credential & {
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

export type GitHubAccountOptions = Options & {
  redirectUrl?: string;
  windowFeature?: string;
}
