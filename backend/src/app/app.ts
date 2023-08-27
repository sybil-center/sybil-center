import { ProofService } from "../base/service/proof.service.js";
import { createInjector, Injector } from "typed-inject";
import { IssuerContainer } from "../base/service/issuer-container.js";
import { type ILogger, Logger } from "../backbone/logger.js";
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
import { CaptchaService, ICaptchaService } from "../base/service/captcha.service.js";
import { configController } from "../base/controller/config.controller.js";
import { GateService, type IGateService } from "../base/service/gate.service.js";

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
  captchaService: ICaptchaService;
  gateService: IGateService
};

export class App {
  #context: Injector<DI> | undefined = undefined;
  private constructor() {}

  get context() {
    if (!this.#context) throw new Error("Context is undefined");
    return this.#context;
  }

  private set context(context) {
    this.#context = context;
  }

  static async init(): Promise<App> {
    const app = new App();
    app.context = createInjector()
      .provideClass("logger", Logger)
      .provideClass("config", Config)
      .provideClass("httpServer", HttpServer)
      .provideClass("didService", DIDService)
      .provideClass("multiSignService", MultiSignService)
      .provideClass("proofService", ProofService)
      .provideClass("credentialVerifier", CredentialVerifier)
      .provideClass("captchaService", CaptchaService)
      .provideClass("apiKeyService", ApiKeyService)
      .provideClass("gateService", GateService)

      // Issuers
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)

      .provideClass("issuerContainer", IssuerContainer);
    const httpServer = app.context.resolve("httpServer");
    const issuerContainer = app.context.resolve("issuerContainer");
    const config = app.context.resolve("config");
    const verifier = app.context.resolve("credentialVerifier");
    const apiKeyService = app.context.resolve("apiKeyService");
    await httpServer.register();
    credentialController(
      httpServer.fastify,
      issuerContainer,
      config,
      verifier,
      apiKeyService
    );
    oauthPageController(app.context);
    apiKeyController(app.context);
    configController(app.context);
    const didService = app.context.resolve("didService");
    await didService.init();
    return app;
  }

  async run() {
    if (!this.context) throw new Error("Use App.init method before");
    const httpServer = this.context.resolve("httpServer");
    await httpServer.listen();
    const didService = this.context.resolve("didService");
    this.context.resolve("logger").info(`Using DID ${didService.id}`);
  }

  async close() {
    if (!this.context) throw new Error("Use App.init method before");
    await this.context.dispose();
  }
}
