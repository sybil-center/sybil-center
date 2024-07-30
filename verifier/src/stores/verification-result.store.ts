import { tokens } from "typed-inject";
import { DbClient } from "../backbone/db-client.js";
import { VerificationResultEntity, VerificationResultEntityNew } from "../entities/verification-result.entity.js";
import { eq, sql } from "drizzle-orm";
import { PgTxn } from "./eth-sybil.store.js";

export class VerificationResultStore {

  private readonly db: DbClient["db"];

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(entity: VerificationResultEntityNew, tx?: PgTxn): Promise<Pick<VerificationResultEntity, "id">> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .insert(VerificationResultEntity)
      .values({
        ...entity,
        data: sql`${entity.data}::jsonb`
      }).returning({ id: VerificationResultEntity.id })
      .execute();
    return result!;
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

  async findByIs(id: string, tx?: PgTxn): Promise<VerificationResultEntity> {
    const entity = await this.getById(id, tx);
    if (entity) return entity;
    throw new Error(`Can not find Verification Result by id: ${id}`);
  }
}