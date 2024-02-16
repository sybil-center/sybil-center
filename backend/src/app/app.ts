import { VCSignatureProver } from "../services/vc/vc-signature-prover.js";
import { createInjector, Injector } from "typed-inject";
import { VCIssuerContainer } from "../services/vc/vc-issuer-container.js";
import { type ILogger, Logger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { VCCredentialController } from "../controllers/vc-credential.controller.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../services/did.service.js";
import { VCMultiSignatureService } from "../services/vc/vc-sign-message/multi-sign.service.js";
import { EthereumAccountIssuer } from "../issuers/vc/ethereum-account/index.js";
import { TwitterAccountIssuer } from "../issuers/vc/twitter-account/index.js";
import { GitHubAccountIssuer } from "../issuers/vc/github-account/index.js";
import { DiscordAccountIssuer } from "../issuers/vc/discord-account/index.js";
import { oauthController } from "../controllers/oauth.controller.js";
import { VCCredentialVerifier } from "../services/vc/vc-credential-verifivator.js";
import { GateBuilder } from "../services/gate-builder.js";
import { personaKYCController } from "../controllers/persona-kyc.controller.js";
import { CredentialProver } from "../services/credential-provers/index.js";
import { SignatureVerifier } from "../services/signature-verifier/index.js";
import { PassportIssuer } from "../issuers/zcred/passport/index.js";
import { SHUFTI_KYC_CONTROLLER } from "../controllers/kyc/shuftipro/index.js";
import { issuersController } from "../controllers/zcred-issuer/index.js";
import { PrincipalIssuer } from "../issuers/zcred/index.js";
import { PassportStubKYCController } from "../issuers/zcred/passport/controllers/kyc-stub-controller.js";

type DI = {
  logger: ILogger;
  config: Config;
  httpServer: HttpServer;
  didService: DIDService;
  issuerContainer: VCIssuerContainer;
  vcMultiSignatureService: VCMultiSignatureService;
  ethereumAccountIssuer: EthereumAccountIssuer;
  discordAccountIssuer: DiscordAccountIssuer;
  twitterAccountIssuer: TwitterAccountIssuer;
  gitHubAccountIssuer: GitHubAccountIssuer;
  vcCredentialVerifier: VCCredentialVerifier;
  gateBuilder: GateBuilder;
  credentialProver: CredentialProver;
  signatureVerifier: SignatureVerifier;
  passportIssuer: PassportIssuer;
  principalIssuer: PrincipalIssuer;
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
      .provideClass("vcMultiSignatureService", VCMultiSignatureService)
      .provideClass("vcSignatureProver", VCSignatureProver)
      .provideClass("vcCredentialVerifier", VCCredentialVerifier)
      .provideClass("gateBuilder", GateBuilder)

      // VC Issuers
      .provideClass("ethereumAccountIssuer", EthereumAccountIssuer)
      .provideClass("twitterAccountIssuer", TwitterAccountIssuer)
      .provideClass("gitHubAccountIssuer", GitHubAccountIssuer)
      .provideClass("discordAccountIssuer", DiscordAccountIssuer)
      // VC Issuer Manager
      .provideClass("issuerContainer", VCIssuerContainer)

      // For ZCred protocol
      // .provideClass("shuftiproKYC", ShuftiproKYC)
      .provideClass("credentialProver", CredentialProver)
      .provideClass("signatureVerifier", SignatureVerifier)
      .provideClass("passportIssuer", PassportIssuer)
      .provideClass("principalIssuer", PrincipalIssuer);


    const httpServer = app.context.resolve("httpServer");
    await httpServer.register();

    // Controllers
    VCCredentialController(app.context);
    oauthController(app.context);
    personaKYCController(app.context);
    // ZCred controllers
    issuersController(app.context);
    SHUFTI_KYC_CONTROLLER.passportIssuerWebhook(app.context);
    PassportStubKYCController(app.context);

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
