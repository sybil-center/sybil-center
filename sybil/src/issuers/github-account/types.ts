import { Challenge, ChallengeReq, Credential, IssueReq, Options } from "../../base/types/index.js";

export type GitHubAccountChallengeReq = ChallengeReq & {
  redirectUrl?: string;
  props?: GitHubAccountProps[]
}

export type GitHubAccountChallenge = Challenge & {
  authUrl: string;
}

export type GitHubAccountIssueReq = IssueReq

export type GitHubAccountVC = Credential & {
  credentialSubject: {
    id: string;
    github: {
      id?: number;
      username?: string;
      userPage?: string;
    };
    custom?: { [key: string]: any }
  };
}

export type GitHubAccountProps = keyof GitHubAccountVC["credentialSubject"]["github"]

export const githubAccountProps: GitHubAccountProps[] = ["id", "username", "userPage"];

export type GitHubAccountOptions = Options & {
  redirectUrl?: string;
  windowFeature?: string;
  props?: GitHubAccountProps[];
}
