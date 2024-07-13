import { DbClient } from "../backbone/db-client.js";
import { tokens } from "typed-inject";
import { JalProgram } from "@jaljs/core";
import { PgTxn } from "./eth-sybil.store.js";
import { JalEntity, JalEntityNew } from "../entities/jal.entity.js";
import sortKeys from "sort-keys";
import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";

export class JalStore {

  private readonly db: DbClient["db"];

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(jalProgram: JalProgram, tx?: PgTxn): Promise<Pick<JalEntity, "id">> {
    const id = toId(jalProgram);
    const entity: JalEntityNew = {
      id: id,
      program: jalProgram
    };
    const executor = tx ? tx : this.db;
    const [result] = await executor.insert(JalEntity)
      .values({
        ...entity,
        program: sql`${entity.program}::jsonb`
      })
      .returning({ id: JalEntity.id })
      .execute();
    return result!;
  }

  async getById(id: string, tx?: PgTxn): Promise<JalEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor.select()
      .from(JalEntity)
      .where(eq(JalEntity.id, id))
      .execute();
    return result;
  }

  async findById(id: string, tx?: PgTxn): Promise<JalEntity> {
    const result = await this.getById(id, tx);
    if (result) return result;
    throw new Error(`Can not find JAL entity by id`);
  }

  async getByProgram(jalProgram: JalProgram, tx?: PgTxn): Promise<JalEntity | undefined> {
    const id = toId(jalProgram);
    return await this.getById(id, tx);
  }

  async findByProgram(jalProgram: JalProgram, tx?: PgTxn): Promise<JalEntity> {
    const result = await this.getByProgram(jalProgram, tx);
    if (result) return result;
    throw new Error(`Can not find JAL entity by JAL program`)
  }
}

function toId(jalProgram: JalProgram): string {
  const sortedProgram = sortKeys(jalProgram, { deep: true });
  return crypto.createHash("sha256")
    .update(JSON.stringify(sortedProgram))
    .digest("hex");
}