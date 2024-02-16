import { createInjector, Injector } from "typed-inject";
import { type ILogger, Logger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../services/did.service.js";
import { GateBuilder } from "../services/gate-builder.js";
import { CredentialProver } from "../services/credential-provers/index.js";
import { SignatureVerifier } from "../services/signature-verifier/index.js";
import { PassportIssuer } from "../issuers/passport/index.js";
import { ZCredIssuerController } from "../controllers/zcred-issuer/index.js";
import { PrincipalIssuer } from "../issuers/index.js";
import { StubKYCPassportController } from "../issuers/passport/controllers/stub-kyc.controller.js";

type DI = {
  logger: ILogger;
  config: Config;
  httpServer: HttpServer;
  didService: DIDService;
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
      .provideClass("gateBuilder", GateBuilder)
      // For ZCred protocol
      .provideClass("credentialProver", CredentialProver)
      .provideClass("signatureVerifier", SignatureVerifier)
      .provideClass("passportIssuer", PassportIssuer)
      .provideClass("principalIssuer", PrincipalIssuer);

    const httpServer = app.context.resolve("httpServer");
    await httpServer.register();

    // ZCred controllers
    ZCredIssuerController(app.context);
    StubKYCPassportController(app.context);

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
