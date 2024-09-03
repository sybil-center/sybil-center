import { DbClient } from "../backbone/db-client.js";
import { tokens } from "typed-inject";
import { ProvingResult } from "../types/index.js";
import { ProvingResultEntity } from "../models/entities/proving-result.entity.js";
import { PgTxn } from "./eth-sybil.store.js";
import { eq, sql } from "drizzle-orm";


export class ProvingResultStore {

  private readonly db: DbClient["db"];

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save({ provingResult, jalId }: {
    provingResult: ProvingResult;
    jalId: string;
  }, tx?: PgTxn): Promise<Pick<ProvingResultEntity, "id">> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .insert(ProvingResultEntity)
      .values({
        result: sql`${provingResult}::jsonb`,
        jalId: jalId
      })
      .returning({ id: ProvingResultEntity.id })
      .execute();
    return result!;
  }

  async getById(id: string, tx?: PgTxn): Promise<ProvingResultEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor.select()
      .from(ProvingResultEntity)
      .where(eq(ProvingResultEntity.id, id))
      .execute();
    return result;
  }

  async findById(id: string, tx?: PgTxn): Promise<ProvingResultEntity> {
    const result = await this.getById(id, tx);
    if (result) return result;
    throw new Error(`Can not find proving result by id ${id}`);
  }

}