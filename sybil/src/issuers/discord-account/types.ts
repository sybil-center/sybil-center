import { ChallengeReq, Credential, IssueReq, Options, Challenge } from "../../base/types/index.js";

export type DiscordAccountChallengeReq = ChallengeReq & {
  redirectUrl?: string;
}

export type DiscordAccountChallenge = Challenge & {
  authUrl: string;
}

export type DiscordAccountIssueReq = IssueReq

export type DiscordAccountVC = Credential & {
  credentialSubject: {
    id: string;
    discord: {
      id: string;
      username: string;
      discriminator: string;
    };
    custom?: { [key: string]: any }
  };
}

export type DiscordAccountOptions = Options & {
  redirectUrl?: string;
  windowFeature?: string;
}
