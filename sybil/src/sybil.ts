import type { IClient } from "./clients/client.type.js";
import { TwitterAccountClient } from "./clients/twitter-account.client.js";
import { DiscordAccountClient } from "./clients/discord-account.client.js";
import { EthAccountClient } from "./clients/eth-account.client.js";
import { GithubAccountClient } from "./clients/github-account.client.js";
import { HttpClient } from "./util/http-client.js";
import type { SignFn } from "./types/index.js";
import {
  DiscordAccountOptions,
  DiscordAccountVC,
  EthAccountOptions,
  EthAccountVC,
  GitHubAccountOptions,
  GitHubAccountVC,
  TwitterAccountOptions,
  TwitterAccountVC
} from "./types/index.js";

export type CredentialKinds = {
  "twitter-account": {
    kind: TwitterAccountVC,
    options: TwitterAccountOptions
  };
  "discord-account": {
    kind: DiscordAccountVC,
    options: DiscordAccountOptions
  };
  "ethereum-account": {
    kind: EthAccountVC,
    options: EthAccountOptions
  };
  "github-account": {
    kind: GitHubAccountVC,
    options: GitHubAccountOptions
  };
};

export type Clients = {
  [K in keyof CredentialKinds]: IClient<CredentialKinds[K]["kind"], CredentialKinds[K]["options"]>;
};

const DEFAULT_ENDPOINT = new URL("https://api.sybil.center");

export class Sybil {
  readonly clients: Clients;

  constructor(readonly issuerDomain: URL = DEFAULT_ENDPOINT) {
    const httpClient = new HttpClient(issuerDomain);
    this.clients = {
      "twitter-account": new TwitterAccountClient(httpClient),
      "discord-account": new DiscordAccountClient(httpClient),
      "ethereum-account": new EthAccountClient(httpClient),
      "github-account": new GithubAccountClient(httpClient)
    };
  }

  async credential<TName extends keyof CredentialKinds>(
    name: TName,
    signFn: SignFn,
    options?: CredentialKinds[TName]["options"]
  ): Promise<CredentialKinds[TName]["kind"]> {
    const client = this.clients[name];
    if (!client) throw new Error(`Provider ${name} not available`);
    return client.issueCredential(signFn, options);
  }
}
