import { ProofService } from "../base/service/proof.service.js";
import { createInjector, Injector } from "typed-inject";
import { IssuerContainer } from "../base/service/issuer-container.js";
import { Logger, type ILogger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { credentialController } from "../base/controller/credential.controller.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../base/service/did.service.js";
import { MultiSignService } from "../base/service/multi-sign.service.js";
import { EthereumAccountIssuer } from "../mates/ethereum/issuers/ethereum-account/index.js";
import { TwitterAccountIssuer } from "../mates/twitter/issuers/twitter-account/index.js";
import { GitHubAccountIssuer } from "../mates/github/issuers/github-account/index.js";
import { DiscordAccountIssuer } from "../mates/discord/issuers/discord-account/index.js";
import { oauthPageController } from "../base/controller/oauth-page.controller.js";
import { CredentialVerifier } from "../base/service/credential-verifivator.js";
import { ApiKeyService } from "../base/service/api-key.service.js";
import { apiKeyController } from "../base/controller/api-key.controller.js";

type DI = {
  logger: ILogger;
  config: Config;
  httpServer: HttpServer;
  didService: DIDService;
  issuerContainer: IssuerContainer;
  multiSignService: MultiSignService;
  ethereumAccountIssuer: EthereumAccountIssuer;
  discordAccountIssuer: DiscordAccountIssuer;
  twitterAccountIssuer: TwitterAccountIssuer;
  gitHubAccountIssuer: GitHubAccountIssuer;
  credentialVerifier: CredentialVerifier;
  apiKeyService: ApiKeyService;
};

export class App {
  readonly context: Injector<DI>;

  constructor() {
    this.context = createInjector()
      .provideClass("logger", Logger)
      .provideClass("config", Config)
      .provideClass("httpServer", HttpServer)
      .provideClass("didService", DIDService)
      .provideClass("multiSignService", MultiSignService)
      .provideClass("proofService", ProofService)
      .provideClass("credentialVerifier", CredentialVerifier)
      .provideClass("apiKeyService", ApiKeyService)

      // Issuers
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)

      .provideClass("issuerContainer", IssuerContainer);

    const fastify = this.context.resolve("httpServer").fastify;
    const issuerContainer = this.context.resolve("issuerContainer");
    const config = this.context.resolve("config");
    const verifier = this.context.resolve("credentialVerifier");
    const apiKeyService = this.context.resolve("apiKeyService");

    credentialController(
      fastify,
      issuerContainer,
      config,
      verifier,
      apiKeyService
    );
    oauthPageController(fastify);
    apiKeyController(fastify, apiKeyService, config);
  }

  async init() {
    const didService = this.context.resolve("didService");
    await didService.init();
  }

  async run() {
    await this.init();
    const httpServer = this.context.resolve("httpServer");
    await httpServer.listen();
    const didService = this.context.resolve("didService");
    this.context.resolve("logger").info(`Using DID ${didService.id}`);
  }

  async close() {
    await this.context.dispose();
  }
}
