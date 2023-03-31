import { ProofService } from "../base/service/proof-service.js";
import { EmptyIssuer } from "../mates/etc/issuers/empty/index.js";
import { createInjector, Injector } from "typed-inject";
import { IssuerContainer } from "../base/service/issuer-container.js";
import { Logger, type ILogger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { vcController } from "../base/controller/vc-controller.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../base/service/did-service.js";
import { MultiSignService } from "../base/service/multi-sign.service.js";
import { EthereumAccountIssuer } from "../mates/ethereum/issuers/ethereum-account/index.js";
import { TwitterAccountIssuer } from "../mates/twitter/issuers/twitter-account/index.js";
import { GitHubAccountIssuer } from "../mates/github/issuers/github-account/index.js";
import { DiscordAccountIssuer } from "../mates/discord/issuers/discord-account/index.js";
import { oauthPageController } from "../base/controller/oauth-page-controller.js";

type DI = {
  logger: ILogger;
  config: Config;
  httpServer: HttpServer;
  didService: DIDService;
  issuerContainer: IssuerContainer;
  multiSignService: MultiSignService;
  emptyIssuer: EmptyIssuer;
  ethereumAccountIssuer: EthereumAccountIssuer;
  discordAccountIssuer: DiscordAccountIssuer;
  twitterAccountIssuer: TwitterAccountIssuer;
  gitHubAccountIssuer: GitHubAccountIssuer;
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

      // Issuers
      .provideClass("emptyIssuer", EmptyIssuer)
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)

      .provideClass("issuerContainer", IssuerContainer);

    const fastify = this.context.resolve("httpServer").fastify;
    const issuerContainer = this.context.resolve("issuerContainer");
    const config = this.context.resolve("config");

    vcController(fastify, issuerContainer, config);
    oauthPageController(fastify);
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
