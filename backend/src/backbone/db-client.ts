
import { tokens, type Disposable } from "typed-inject";
import { Config } from "./config.js";
import * as schema from "../models/entities/schema.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export class DbClient implements Disposable {

  private readonly client;
  readonly db;

  static readonly inject = tokens("config");

  constructor(
    config: Config
  ) {
    this.client = postgres(config.db.url);
    this.db = drizzle(this.client, { schema: schema });
  }

  async dispose() {
    await this.client.end();
  }

}
