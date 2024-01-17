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
import { zkCredController } from "../base/controller/zk-cred.controller.js";
import { personaKYCController } from "../base/controller/persona-kyc.controller.js";
import { ZKCPassportIssuer } from "../issuers/zkc/passport/issuer.js";
import { ZKCSignerManager } from "../base/service/signers/zkc.signer-manager.js";
import { SignVerifierManager } from "../base/service/verifiers/sign-verifier.manager.js";
import { ZKCIssuerManager } from "../issuers/zkc/zkc-issuer.manager.js";
import { CredentialProver } from "../services/credential-prover/index.js";
import { SignatureVerifier } from "../services/signature-verifier/index.js";
import { ShuftiproKYC } from "../services/kyc/shuftipro.js";
import { PassportIssuer } from "../issuers/zcred/passport/index.js";
import { SHUFTI_KYC_CONTROLLER } from "../controllers/kyc/shuftipro/index.js";
import { issuersController } from "../controllers/zcred-issuer/index.js";
import { PrincipalIssuer } from "../issuers/zcred/index.js";
import { PassportTestIssuer } from "../issuers/zcred/passport-test/index.js";

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
  zkcPassportIssuer: ZKCPassportIssuer;
  zkcIssuerManager: ZKCIssuerManager;
  zkcSignerManager: ZKCSignerManager;
  signVerifierManager: SignVerifierManager;
  credentialProver: CredentialProver;
  shuftiproKYC: ShuftiproKYC;
  signatureVerifier: SignatureVerifier;
  passportIssuer: PassportIssuer;
  principalIssuer: PrincipalIssuer;
  passportTestIssuer: PassportTestIssuer;
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
    // @ts-expect-error
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
      .provideClass("zkcSignerManager", ZKCSignerManager)
      .provideClass("signVerifierManager", SignVerifierManager)

      // Issuers
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)
      // Issuer Manager
      .provideClass("issuerContainer", IssuerContainer)

      // Zkc Issuers
      .provideClass("zkcPassportIssuer", ZKCPassportIssuer)
      // Zkc Issuer Manager
      .provideClass("zkcIssuerManager", ZKCIssuerManager)

      // For ZCred protocol
      .provideClass("shuftiproKYC", ShuftiproKYC)
      .provideClass("credentialProver", CredentialProver)
      .provideClass("signatureVerifier", SignatureVerifier)
      // @ts-expect-error
      .provideClass("passportIssuer", PassportIssuer)
      .provideClass("passportTestIssuer", PassportTestIssuer)
      .provideClass("principalIssuer", PrincipalIssuer);


    const httpServer = app.context.resolve("httpServer");
    await httpServer.register();

    // Controllers
    credentialController(app.context);
    oauthController(app.context);
    apiKeyController(app.context);
    configController(app.context);
    zkCredController(app.context);
    personaKYCController(app.context);
    // ZCred controllers
    issuersController(app.context);
    SHUFTI_KYC_CONTROLLER.passportIssuerWebhook(app.context);

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
