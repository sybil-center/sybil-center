import { Config } from "./backbone/config.js";
import { HttpServer } from "./backbone/http-server.js";
import { VerifierController } from "./controllers/verifier.controller.js";
import { createInjector, Injector } from "typed-inject";
import {
  getProposerConstructors,
  getZkResultHandlerConstructors,
  toProposerToken,
  toResultHandlerToken
} from "./services/verifiers-initialize.js";
import { MainProposer } from "./verifiers/main-proposer.js";
import { MainZcredResultHandler } from "./verifiers/main-zcred-result-handler.js";
import { DbClient } from "./backbone/db-client.js";
import { EthSybilStore } from "./stores/eth-sybil.store.js";
import { EthSybilController } from "./verifiers/o1js-ethereum-passport/eth-sybil.controller.js";
import { CacheClient } from "./backbone/cache-client.js";
import { JalStore } from "./stores/jal.store.js";
import { JalService } from "./services/jal.service.js";
import { JalController } from "./controllers/jal.controller.js";
import { ProvingResultStore } from "./stores/proving-result.store.js";
import { ProvingResultService } from "./services/proving-result.service.js";
import { ProvingResultController } from "./controllers/proving-result.controller.js";
import { VerifierManager } from "./services/verifier-manager.js";
import { CustomVerifierController } from "./controllers/custom-verifier.controller.js";
import { JalCommentStore } from "./stores/jal-comment.store.js";
import { JalCommentService } from "./services/jal-comment.service.js";
import { SiweService } from "./services/siwe.service.js";
import { VerificationResultStore } from "./stores/verification-result.store.js";
import { VerificationService } from "./services/verification.service.js";
import { VerificationResultController } from "./controllers/verification-result.controller.js";
import { VerificationWebhookStore } from "./stores/verification-webhook.store.js";

type PreDI = {
  config: Config;
  httpServer: HttpServer;
  dbClient: DbClient;
  ethSybilStore: EthSybilStore;
  verificationWebhookStore: VerificationWebhookStore;
  cacheClient: CacheClient;
  jalStore: JalStore;
  jalService: JalService;
  provingResultStore: ProvingResultStore;
  provingResultService: ProvingResultService;
  verifierManager: VerifierManager;
  jalCommentStore: JalCommentStore;
  jalCommentService: JalCommentService;
  siweService: SiweService;
  verificationResultStore: VerificationResultStore;
  verificationService: VerificationService;
}

export type DI = PreDI & {
  mainProposer: MainProposer;
  mainZcredResultHandler: MainZcredResultHandler;
}


export type Tokens<T extends keyof DI> = keyof Pick<DI, T>

export class App {
  private _context?: Injector<DI>;
  _rootContext?: Injector;

  get context() {
    if (this._context) return this._context;
    throw new Error(`Initialize application first`);
  }

  get rootContext() {
    if (this._rootContext) return this._rootContext;
    throw new Error(`Initialize application first`);
  }

  private constructor() {}

  static async init(): Promise<App> {
    try {
      const app = new App();
      const rootContext = createInjector();
      app._rootContext = rootContext;

      let context: Injector<any> = rootContext
        .provideClass("config", Config)
        .provideClass("cacheClient", CacheClient)
        .provideClass("dbClient", DbClient)
        .provideClass("ethSybilStore", EthSybilStore)
        .provideClass("verificationWebhookStore", VerificationWebhookStore)
        .provideClass("jalStore", JalStore)
        .provideClass("jalCommentStore", JalCommentStore)
        .provideClass("jalCommentService", JalCommentService)
        .provideClass("siweService", SiweService)
        .provideClass("jalService", JalService)
        .provideClass("provingResultStore", ProvingResultStore)
        .provideClass("provingResultService", ProvingResultService)
        .provideClass("verifierManager", VerifierManager)
        .provideClass("verificationResultStore", VerificationResultStore)
        .provideClass("verificationService", VerificationService)
        .provideClass("httpServer", HttpServer) satisfies Injector<PreDI>;

      for (const [id, constructor] of (await getProposerConstructors()).entries()) {
        context = context.provideClass(toProposerToken(id), constructor);
      }
      for (const [id, constructor] of (await getZkResultHandlerConstructors()).entries()) {
        context = context.provideClass(toResultHandlerToken(id), constructor);
      }

      app._context = (context as Injector<PreDI>)
        .provideClass("mainProposer", MainProposer)
        .provideClass("mainZcredResultHandler", MainZcredResultHandler);

      await app.context.resolve("httpServer").register();

      VerifierController(app.context);
      EthSybilController(app.context);
      JalController(app.context);
      ProvingResultController(app.context);
      CustomVerifierController(app.context);
      VerificationResultController(app.context);
      return app;
    } catch (e: any) {
      console.log(e.message);
      throw e;
    }
  }

  async run() {
    await this.context.resolve("httpServer").listen();
  }

  async close() {
    await this.rootContext.dispose();
  }
}