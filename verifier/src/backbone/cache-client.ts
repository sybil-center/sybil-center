import Keyv from "@keyvhq/core";
import KeyvPostgreSQL from "@keyvhq/postgres";
import { Disposable, tokens } from "typed-inject";
import { Config } from "./config.js";

export class CacheClient implements Disposable {

  private readonly cashes: Keyv[] = [];
  static inject = tokens("config");
  constructor(
    private readonly config: Config
  ) {}

  createTtlCache<T>(input: {
    namespace: string;
    ttl?: number;
  }): Keyv<T> {
    const store = new KeyvPostgreSQL<T>(this.config.db.url);
    const cache = new Keyv<T>({
      store: store,
      namespace: input.namespace,
      ttl: input.ttl
    });
    this.cashes.push(cache);
    return cache;
  }

  async dispose() {
    for (const c of this.cashes) {
      await c.clear();
    }
  }
}