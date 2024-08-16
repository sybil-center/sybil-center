import { tokens } from "typed-inject";
import { DbClient } from "../backbone/db-client.js";
import { VerificationWebhookEntity, VerificationWebhookEntityNew } from "../entities/verification-webhook.entity.js";
import { PgTxn } from "./eth-sybil.store.js";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { VerificationResultEntity } from "../entities/verification-result.entity.js";
import { Tokens } from "../app.js";

type PageFilter = {
  conditions?: Partial<VerificationWebhookEntity>;
  page: {
    size: number;
    index: number;
  },
  order?: {
    asc?: (keyof Required<VerificationResultEntity>)[],
    desc?: (keyof Required<VerificationResultEntity>)[]
  }
}

export class VerificationWebhookStore {

  private readonly db: DbClient["db"];

  static inject = tokens<[Tokens<"dbClient">]>("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(entity: VerificationWebhookEntityNew, tx?: PgTxn): Promise<Pick<VerificationWebhookEntity, "id">> {
    const executor = tx ? tx : this.db;
    const [result] = await executor.insert(VerificationWebhookEntity)
      .values(entity)
      .returning({ id: VerificationWebhookEntity.id })
      .execute();
    return result!;
  }

  async getById(id: string, tx?: PgTxn): Promise<VerificationWebhookEntity | undefined> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select()
      .from(VerificationWebhookEntity)
      .where(eq(VerificationWebhookEntity.id, id))
      .execute();
    return result;
  }

  async findById(id: string, tx?: PgTxn): Promise<VerificationWebhookEntity> {
    const entity = await this.getById(id, tx);
    if (entity) return entity;
    throw new Error(`Webhook result entity not found by id: ${id}`);
  }

  async findByFilter(filter: Partial<VerificationWebhookEntity>, tx?: PgTxn) {
    const executor = tx ? tx : this.db;
    const equals: ReturnType<typeof eq>[] = [];
    for (const key of Object.keys(filter)) {
      const value = (<any>filter)[key]!;
      equals.push(eq((<any>VerificationWebhookEntity)[key]!, value));
    }
    const query = executor.select().from(VerificationWebhookEntity);
    if (equals.length !== 0) {
      query.where(and(...equals));
    }
    const result = await query.execute();
    return result;
  }

  async getPageByFilter(filter: PageFilter, tx?: PgTxn): Promise<{
    data: VerificationWebhookEntity[],
    currentIndex: number;
    nextIndex: number | null;
    prevIndex: number | null;

    count: number;
  }> {
    const conditions = filter.conditions ? filter.conditions : {};
    const equals: ReturnType<typeof eq>[] = [];
    for (const key of Object.keys(conditions)) {
      const value = (<any>conditions)[key]!;
      equals.push(eq((<any>VerificationWebhookEntity)[key], value));
    }
    const ordersAsc: ReturnType<typeof asc>[] = [];
    if (filter.order?.asc) {
      for (const key of filter.order.asc) {
        ordersAsc.push(asc((<any>VerificationWebhookEntity)[key]));
      }
    }
    const ordersDesc: ReturnType<typeof desc>[] = [];
    if (filter.order?.desc) {
      for (const key of filter.order.desc) {
        ordersDesc.push(desc((<any>VerificationWebhookEntity)[key]));
      }
    }
    const executor = tx ? tx : this.db;
    const rowsCount = await this.countRows(equals, executor);
    const pageCount = Math.ceil(rowsCount / filter.page.size);
    const nextIndex = (filter.page.index + 1) < pageCount
      ? filter.page.index + 1
      : null;
    const prevIndex = (filter.page.index + 1) === 1
      ? null
      : filter.page.index - 1;
    const query = executor.select().from(VerificationWebhookEntity);
    if (equals.length !== 0) {
      query.where(and(...equals));
    }
    if (ordersAsc.length !== 0 || ordersDesc.length !== 0) {
      query.orderBy(...ordersAsc, ...ordersDesc);
    }
    const result = await query
      .limit(filter.page.size)
      .offset(filter.page.index * filter.page.size)
      .execute();
    return {
      data: result,
      currentIndex: filter.page.index,
      nextIndex: nextIndex,
      prevIndex: prevIndex,
      count: pageCount,
    };
  }

  async countRows(constraints: ReturnType<typeof eq>[], tx?: PgTxn): Promise<number> {
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .select({ count: count() })
      .from(VerificationWebhookEntity)
      .where(and(...constraints))
      .execute();
    return result!.count;
  }
}