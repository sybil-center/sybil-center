import { DbClient } from "../backbone/db-client.js";
import { tokens } from "typed-inject";
import { eq } from "drizzle-orm";
import { EthSybilEntity, EthSybilEntityNew } from "../entities/eth-sybil.entity.js";


export type PgTxn = Parameters<Parameters<DbClient["db"]["transaction"]>[0]>[0] | DbClient["db"]


export class EthSybilStore {

  private readonly db;

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(sybilEntity: EthSybilEntityNew, tx?: PgTxn): Promise<Pick<EthSybilEntity, "id">> {
    sybilEntity.sybilId = sybilEntity.sybilId.startsWith("0x")
      ? sybilEntity.sybilId
      : `0x${sybilEntity.sybilId}`;
    sybilEntity.address = sybilEntity.address.startsWith("0x")
      ? sybilEntity.address
      : `0x${sybilEntity.address}`;
    sybilEntity.signature = sybilEntity.signature.startsWith("0x")
      ? sybilEntity.signature
      : `0x${sybilEntity.signature}`;
    if (sybilEntity.sybilId.length !== 42) {
      const delta = 42 - sybilEntity.sybilId.length;
      sybilEntity.sybilId = "0x" + "0".repeat(delta) + sybilEntity.sybilId.slice(2);
    }
    if (sybilEntity.address.length !== 42) {
      const delta = 42 - sybilEntity.address.length;
      sybilEntity.address = "0x" + "0".repeat(delta) + sybilEntity.address.slice(2);
    }
    if (sybilEntity.signature.length !== 132) {
      const delta = 132 - sybilEntity.signature.length;
      sybilEntity.signature = "0x" + "0".repeat(delta) + sybilEntity.signature.slice(2);
    }
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .insert(EthSybilEntity)
      .values(sybilEntity)
      .returning({ id: EthSybilEntity.id })
      .execute();
    return result!;
  }

  async findByAddress(address: string, tx?: PgTxn): Promise<EthSybilEntity> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(EthSybilEntity)
      .where(eq(EthSybilEntity.address, address))
      .execute();
    if (result) return result;
    throw new Error(`Can not find user with ethereum address: ${address}`);
  }

  async getByAddress(address: string, tx?: PgTxn): Promise<EthSybilEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(EthSybilEntity)
      .where(eq(EthSybilEntity.address, address))
      .execute();
    return result;
  }

}