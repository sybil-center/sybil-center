import { DbClient } from "../backbone/db-client.js";
import { tokens } from "typed-inject";
import { ClientEntity, ClientEntityNew } from "../entities/client.entity.js";
import { PgTxn } from "./eth-sybil.store.js";
import { eq, sql } from "drizzle-orm";

export class ClientStore {

  private readonly db;

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(entity: ClientEntityNew, tx?: PgTxn): Promise<Pick<ClientEntity, "subjectId">> {
    if (entity.subjectId.length === 0) throw Error("Can not create client, invalid subject id");
    const [namespace, reference, pubkey] = entity.subjectId.split(":");
    if (!namespace || !reference || !pubkey) throw Error("Can not create client invalid subject id");
    if (entity.subjectId.startsWith("ethereum:address")) {
      entity.subjectId = [namespace, reference, pubkey.toLowerCase()].join(":");
    }
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .insert(ClientEntity)
      .values({
        ...entity,
        tokenMap: sql`${entity.tokenMap ? entity.tokenMap : {}}::jsonb`
      })
      .returning({ subjectId: ClientEntity.subjectId })
      .execute();
    return result!;
  }

  async getBySubjectId(subjectId: string, tx?: PgTxn): Promise<ClientEntity | undefined> {
    const [namespace, reference, pubkey] = subjectId.split(":");
    if (!namespace || !reference || !pubkey) {
      throw Error(`Can not find client by subject id ${subjectId}. Invalid subject id`);
    }
    if (subjectId.startsWith("ethereum:address")) {
      subjectId = [namespace, reference, pubkey.toLowerCase()].join(":");
    }
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(ClientEntity)
      .where(eq(ClientEntity.subjectId, subjectId))
      .execute();
    return result;
  }

  async findBySubjectId(subjectId: string, tx?: PgTxn): Promise<ClientEntity> {
    const found = await this.getBySubjectId(subjectId, tx);
    if (found) return found;
    throw new Error(`Can not find client by subject id: ${subjectId}`);
  }

  async getByAccessToken(accessToken: string, tx?: PgTxn): Promise<ClientEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(ClientEntity)
      .where(sql`${ClientEntity.tokenMap} ? ${accessToken}`)
      .execute();
    return result;
  }

  async findByAccessToken(accessToken: string, tx?: PgTxn): Promise<ClientEntity> {
    const executor = tx ? tx : this.db;
    const taken = await this.getByAccessToken(accessToken, executor);
    if (taken) return taken;
    throw new Error(`Can not find client by access token: ${accessToken}`);
  }

  async update(client: ClientEntity, tx?: PgTxn): Promise<ClientEntity> {
    const executor = tx ? tx : this.db;
    await executor.update(ClientEntity)
      .set({
        ...client,
        tokenMap: sql`${client.tokenMap ? client.tokenMap : {}}::jsonb`
      })
      .where(eq(ClientEntity.subjectId, client.subjectId))
      .returning({ subjectId: ClientEntity.subjectId })
      .execute();
    return client;
  }

  async setRedirectURL(o: {
    subjectId: string;
    accessToken: string;
    url: URL
  }, tx?: PgTxn): Promise<ClientEntity> {
    const url = o.url.origin + o.url.pathname;
    const executor = tx ? tx : this.db;
    return await executor.transaction(async (_tx) => {
      const found = await this.findBySubjectId(o.subjectId, _tx);
      if (!found.tokenMap) {
        found.tokenMap = {};
      }
      if (Object.keys(found.tokenMap).length > 20) {
        throw new Error("Client has maximum amount of redirect URLs");
      }
      found.tokenMap[o.accessToken] = url;
      return await this.update(found, _tx);
    });
  }

  async deleteAccessToken(o: {
    subjectId: string;
    accessToken: string;
  }, tx?: PgTxn): Promise<ClientEntity> {
    const { subjectId, accessToken } = o;
    const executor = tx ? tx : this.db;
    return await executor.transaction(async (_tx) => {
      const found = await this.findBySubjectId(subjectId, _tx);
      if (found.tokenMap && found.tokenMap[accessToken]) {
        delete found.tokenMap[accessToken];
      }
      return await this.update(found);
    });
  }

}