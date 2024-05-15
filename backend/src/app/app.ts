import { createInjector, Injector } from "typed-inject";
import { type ILogger, Logger } from "../backbone/logger.js";
import { HttpServer } from "../backbone/http-server.js";
import { Config } from "../backbone/config.js";
import { DIDService } from "../services/did.service.js";
import { GateBuilder } from "../services/gate-builder.js";
import { CredentialProver } from "../services/credential-provers/index.js";
import { SignatureVerifier } from "../services/signature-verifier/index.js";
import { StubKYCPassportController } from "../issuers/passport/controllers/stub-kyc.controller.js";
import { getHttpIssuerControllerConstructorMap, getIssuerConstructorMap } from "../util/index.js";
import { HttpIssuerControllerSupervisor } from "../issuers/http-issuer-controller-supervisor.js";
import { IssuerSupervisor } from "../issuers/issuer-supervisor.js";
import { HttpZcredController } from "../controllers/http-zcred-controller.js";
import { FarquestService } from "../services/farquest.service.js";
import { NeuroVisionKYCPassportController } from "../issuers/passport/controllers/neuro-vision-kyc.controller.js";

type PreDI = {
  logger: ILogger;
  config: Config;
  httpServer: HttpServer;
  didService: DIDService;
  gateBuilder: GateBuilder;
  credentialProver: CredentialProver;
  signatureVerifier: SignatureVerifier;
  farquestService: FarquestService;
}

export type DI = PreDI & {
  issuerSupervisor: IssuerSupervisor;
  httpIssuerControllerSupervisor: HttpIssuerControllerSupervisor;
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
    try {
      const app = new App();
      app.rootContext = createInjector();

      let context: Injector<PreDI> = app.rootContext
        .provideClass("logger", Logger)
        .provideClass("config", Config)
        .provideClass("httpServer", HttpServer)
        .provideClass("didService", DIDService)
        .provideClass("gateBuilder", GateBuilder)
        .provideClass("farquestService", FarquestService)
        // For ZCred protocol
        .provideClass("credentialProver", CredentialProver)
        .provideClass("signatureVerifier", SignatureVerifier);

      const issuerConstructorMap = await getIssuerConstructorMap();
      for (const [token, constructor] of issuerConstructorMap.entries()) {
        // @ts-expect-error
        context = context.provideClass(token, constructor);
      }

      const httpIssuerControllerConstructorMap = await getHttpIssuerControllerConstructorMap();
      for (const [token, constructor] of httpIssuerControllerConstructorMap.entries()) {
        // @ts-expect-error
        context = context.provideClass(token, constructor);
      }
      app.context = context
        .provideClass("issuerSupervisor", IssuerSupervisor)
        .provideClass("httpIssuerControllerSupervisor", HttpIssuerControllerSupervisor);


      const httpServer = app.context.resolve("httpServer");
      await httpServer.register();

      // ZCred controllers
      // ZCredIssuerController(app.context);
      HttpZcredController(app.context);
      StubKYCPassportController(app.context);
      NeuroVisionKYCPassportController(app.context);

      const didService = app.context.resolve("didService");
      await didService.init();
      return app;
    } catch (e: any) {
      console.log(`Init issuer app error. Message: ${e.message}`);
      throw e;
    }

  }

  async run() {
    try {
      if (!this.context) throw new Error("Use App.init method before");
      const httpServer = this.context.resolve("httpServer");
      await httpServer.listen();
      const didService = this.context.resolve("didService");
      this.context.resolve("logger").info(`Using DID ${didService.id}`);
    } catch (e: any) {
      console.log(`Run issuer app error. Message: ${e.message}`);
      throw e;
    }

  }

  async close() {
    if (!this.rootContext) throw new Error("Use App.init method before");
    await this.rootContext.dispose();
  }
}
