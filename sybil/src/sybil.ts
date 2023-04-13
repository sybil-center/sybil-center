import { TwitterAccountIssuer, TwitterAccountOptions, TwitterAccountVC } from "./issuers/twitter-account/index.js";
import { DiscordAccountIssuer, DiscordAccountOptions, DiscordAccountVC } from "./issuers/discord-account/index.js";
import { EthAccountIssuer, EthAccountOptions, EthAccountVC } from "./issuers/ethereum-account/index.js";
import { GithubAccountIssuer, GitHubAccountOptions, GitHubAccountVC } from "./issuers/github-account/index.js";
import { HttpClient } from "./base/http-client.js";
import { APIKeys, Credential, SubjectProof, VerifyResult } from "./base/types/index.js";
import { AtLeastOne } from "./base/types/useful.js";


export type CredentialKinds = {
  "twitter-account": {
    kind: TwitterAccountVC,
    issuer: TwitterAccountIssuer
    options: TwitterAccountOptions
  };
  "discord-account": {
    kind: DiscordAccountVC,
    issuer: DiscordAccountIssuer,
    options: DiscordAccountOptions
  };
  "ethereum-account": {
    kind: EthAccountVC,
    issuer: EthAccountIssuer,
    options: EthAccountOptions
  };
  "github-account": {
    kind: GitHubAccountVC,
    issuer: GithubAccountIssuer,
    options: GitHubAccountOptions
  };
};

export type Issuers = {
  [K in keyof CredentialKinds]: CredentialKinds[K]["issuer"];
};


export class Sybil {
  readonly issuers: Issuers;
  private readonly httpClient: HttpClient;

  constructor(
    readonly apiKeys: AtLeastOne<APIKeys>,
    readonly issuerDomain?: URL
  ) {
    this.httpClient = new HttpClient(this.apiKeys, issuerDomain);
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
    const issuer = this.issuer(name);
    return issuer.issueCredential(subjectProof, options);
  }

  issuer<TName extends keyof Issuers>(
    name: TName
  ): Issuers[TName] {
    const issuer = this.issuers[name];
    if (!issuer) throw new Error(`Issuer ${name} not available`);
    return issuer;
  }

  /** Execute request to verify Credential */
  async verify<TCredential = Credential>(
    credential: TCredential
  ): Promise<VerifyResult> {
    return this.httpClient.verify<TCredential>(credential);
  }
}
