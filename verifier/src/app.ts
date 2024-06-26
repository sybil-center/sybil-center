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
import { ClientStore } from "./stores/client.store.js";
import { ClientService } from "./services/client-service.js";
import { ClientController } from "./controllers/client.controller.js";
import { CacheClient } from "./backbone/cache-client.js";

type PreDI = {
  config: Config;
  httpServer: HttpServer;
  dbClient: DbClient;
  ethSybilStore: EthSybilStore;
  clientStore: ClientStore;
  clientService: ClientService;
  cacheClient: CacheClient;
}

export type DI = PreDI & {
  mainProposer: MainProposer;
  mainZcredResultHandler: MainZcredResultHandler;
}

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
    const app = new App();
    const rootContext = createInjector();
    app._rootContext = rootContext;

    let context: Injector<any> = rootContext
      .provideClass("config", Config)
      .provideClass("cacheClient", CacheClient)
      .provideClass("dbClient", DbClient)
      .provideClass("ethSybilStore", EthSybilStore)
      .provideClass("clientStore", ClientStore)
      .provideClass("clientService", ClientService)
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
    ClientController(app.context);
    return app;
  }

  async run() {
    await this.context.resolve("httpServer").listen();
  }

  async close() {
    await this.rootContext.dispose();
  }
}