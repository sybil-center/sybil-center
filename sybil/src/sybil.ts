import type { Issuer } from "./base/issuer.type.js";
import { TwitterAccountIssuer, TwitterAccountOptions, TwitterAccountVC } from "./issuers/twitter-account/index.js";
import { DiscordAccountIssuer, DiscordAccountOptions, DiscordAccountVC } from "./issuers/discord-account/index.js";
import { EthAccountIssuer, EthAccountOptions, EthAccountVC } from "./issuers/ethereum-account/index.js";
import { GithubAccountIssuer, GitHubAccountOptions, GitHubAccountVC } from "./issuers/github-account/index.js";
import { HttpClient } from "./base/http-client.js";
import { Credential, SubjectProof, VerifyResult } from "./base/types/index.js";


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

export type Issuers = {
  [K in keyof CredentialKinds]: Issuer<CredentialKinds[K]["kind"], CredentialKinds[K]["options"]>;
};

const DEFAULT_ENDPOINT = new URL("https://api.sybil.center");

export class Sybil {
  readonly issuers: Issuers;
  private readonly httpClient: HttpClient;

  constructor(readonly issuerDomain: URL = DEFAULT_ENDPOINT) {
    this.httpClient = new HttpClient(issuerDomain);
    this.issuers = {
      "twitter-account": new TwitterAccountIssuer(this.httpClient),
      "discord-account": new DiscordAccountIssuer(this.httpClient),
      "ethereum-account": new EthAccountIssuer(this.httpClient),
      "github-account": new GithubAccountIssuer(this.httpClient)
    };
  }

  async credential<TName extends keyof CredentialKinds>(
    name: TName,
    subjectProof: SubjectProof,
    options?: CredentialKinds[TName]["options"]
  ): Promise<CredentialKinds[TName]["kind"]> {
    const client = this.issuers[name];
    if (!client) throw new Error(`Provider ${name} not available`);
    return client.issueCredential(subjectProof, options);
  }

  /** Execute request to verify Credential */
  async verify<TCredential = Credential>(
    credential: TCredential
  ): Promise<VerifyResult> {
    return this.httpClient.verify<TCredential>(credential);
  }
}
