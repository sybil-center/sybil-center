import { ProofService } from "../base/service/proof.service.js";
import { createInjector, Injector } from "typed-inject";
import { IssuerContainer } from "../base/service/issuer-container.js";
import { type ILogger, Logger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { credentialController } from "../base/controller/credential.controller.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../base/service/did.service.js";
import { MultiSignService } from "../base/service/multi-sign.service.js";
import { EthereumAccountIssuer } from "../issuers/vc/ethereum-account/index.js";
import { TwitterAccountIssuer } from "../issuers/vc/twitter-account/index.js";
import { GitHubAccountIssuer } from "../issuers/vc/github-account/index.js";
import { DiscordAccountIssuer } from "../issuers/vc/discord-account/index.js";
import { oauthController } from "../base/controller/oauth.controller.js";
import { CredentialVerifier } from "../base/service/credential-verifivator.js";
import { ApiKeyService } from "../base/service/api-key.service.js";
import { apiKeyController } from "../base/controller/api-key.controller.js";
import { CaptchaService, ICaptchaService } from "../base/service/captcha.service.js";
import { configController } from "../base/controller/config.controller.js";
import { GateService, type IGateService } from "../base/service/gate.service.js";
import { ZkcGitHubAccountIssuer } from "../issuers/zkc/github-account/index.js";
import { ZkcSignerManager } from "../base/service/signers/zkc.signer-manager.js";
import { VerifierManager } from "../base/service/verifiers/verifier.manager.js";
import { ZkcIssuerManager } from "../issuers/zkc/zkc.issuer-manager.js";
import { zkCredentialController } from "../base/controller/zk-credential.controller.js";

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
  gateService: IGateService;
  zkcGitHubAccountIssuer: ZkcGitHubAccountIssuer;
  zkcIssuerManager: ZkcIssuerManager
};

export class App {
  #context: Injector<DI> | undefined = undefined;
  #rootContext: Injector | undefined = undefined;
  private constructor() {}

  get context() {
    if (!this.#context) throw new Error("Context is undefined");
    return this.#context;
  }

  private set context(context) {
    this.#context = context;
  }

  get rootContext() {
    if (!this.#rootContext) throw new Error(`Root context is undefined`);
    return this.#rootContext;
  }

  set rootContext(context) {
    this.#rootContext = context;
  }

  static async init(): Promise<App> {
    const app = new App();
    app.rootContext = createInjector();
    app.context = app.rootContext
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
      .provideClass("zkcSignerManager", ZkcSignerManager)
      .provideClass("verifierManager", VerifierManager)

      // Issuers
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)
      // Issuer Manager
      .provideClass("issuerContainer", IssuerContainer)

      // Zkc Issuers
      .provideClass("zkcGitHubAccountIssuer", ZkcGitHubAccountIssuer)
      // Zkc Issuer Manager
      .provideClass("zkcIssuerManager", ZkcIssuerManager);


    const httpServer = app.context.resolve("httpServer");
    await httpServer.register();

    // Controllers
    credentialController(app.context);
    oauthController(app.context);
    apiKeyController(app.context);
    configController(app.context);
    zkCredentialController(app.context);

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
    if (!this.rootContext) throw new Error("Use App.init method before");
    await this.rootContext.dispose();
  }
}
