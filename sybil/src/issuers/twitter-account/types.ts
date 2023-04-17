import { Challenge, ChallengeReq, Credential, IssueReq, Options } from "../../base/types/index.js";

export type TwitterAccountChallengeReq = ChallengeReq & {
  redirectUrl?: string;
  props?: TwitterAccountProps[]
}

export type TwitterAccountChallenge = Challenge & {
  authUrl: string;
}

export type TwitterAccountIssueReq = IssueReq

export type TwitterAccountVC = Credential & {
  credentialSubject: {
    id: string;
    twitter: {
      id?: string;
      username?: string;
    }
    custom?: { [key: string]: any }
  };
}

export type TwitterAccountProps = keyof TwitterAccountVC["credentialSubject"]["twitter"];

export const twitterAccountProps: TwitterAccountProps[] = ["id", "username"]

export type TwitterAccountOptions = Options & {
  redirectUrl?: string;
  windowFeatures?: string;
  props?: TwitterAccountProps[]
}
