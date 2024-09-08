import { tokens } from "typed-inject";
import { DbClient } from "../backbone/db-client.js";
import { VerificationResultEntity } from "../models/entities/verification-result.entity.js";
import { eq, } from "drizzle-orm";
import { PgTxn } from "./eth-sybil.store.js";
import { AbstractStore } from "./abstract.store.js";

export class VerificationResultStore extends AbstractStore {

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient,
  ) {
    super(dbClient.db, VerificationResultEntity)
  }

  async getById(id: string, tx?: PgTxn): Promise<VerificationResultEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(VerificationResultEntity)
      .where(eq(VerificationResultEntity.id, id))
      .execute();
    return result;
  }

  async findById(id: string, tx?: PgTxn): Promise<VerificationResultEntity> {
    const entity = await this.getById(id, tx);
    if (entity) return entity;
    throw new Error(`Can not find Verification Result by id: ${id}`);
  }
}