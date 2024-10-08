import { DbClient } from "../backbone/db-client.js";
import { PgTableWithColumns } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gt, gte, lt, lte, sql, SQL, TableConfig } from "drizzle-orm";
import { PgTxn } from "./eth-sybil.store.js";

type FilterOptions<T extends unknown> = Partial<{
  eq: T;
  gt: T;
  gte: T;
  lt: T;
  lte: T
}>

export type StoreFilter<T extends Record<string, unknown>> = {
  [Key in keyof T]?: FilterOptions<T[Key]>
}

export type PageFilter<T extends Record<string, unknown>> = {
  filter: StoreFilter<T>;
  page: {
    size: number;
    index: number;
  };
  order?: {
    asc?: (keyof Required<T>)[];
    desc?: (keyof Required<T>)[];
  }
}

export type Page<T extends unknown> = {
  result: T[];
  currentIndex: number;
  nextIndex: number | null;
  prevIndex: number | null;
  count: number;
  recordsCount: number;
}

type TableWithColumns = PgTableWithColumns<TableConfig & {
  columns: TableConfig["columns"] & { id: string }
}>

export class AbstractStore<
  TTable extends TableWithColumns = TableWithColumns
> {

  constructor(
    protected readonly db: DbClient["db"],
    private readonly table: any
  ) {}

  async save<
    TEntity extends TTable["$inferInsert"] = TTable["$inferInsert"]
  >(entity: TEntity, tx?: PgTxn, options?: {
    jsonb?: (keyof TEntity)[]
  }): Promise<{ id: string }> {
    const values = { ...entity };
    if (options?.jsonb) {
      for (const key of options.jsonb) {
        // @ts-expect-error
        if (key in values) {values[key] = sql`${entity[key]}::jsonb`;}
      }
    }
    const executor = tx ? tx : this.db;
    const [result] = await executor.insert(this.table)
      .values({
        ...entity
      })
      .returning({ id: this.table.id })
      .execute();
    if (result && "id" in result && typeof result.id === "string") {
      return result as { id: string };
    }
    throw new Error(`Save error ${JSON.stringify(entity)} for table ${this.table._.name}`);
  }

  async getMany<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(filter: StoreFilter<TEntity>, tx?: PgTxn): Promise<TEntity[]> {
    const executor = tx ? tx : this.db;
    // @ts-expect-error
    return await executor
      .select()
      .from(this.table)
      .where(this.getConditionsFromFilter(filter))
      .execute();
  }

  async getOne<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(filter: StoreFilter<TEntity>, tx?: PgTxn): Promise<TEntity | undefined> {
    const [result] = await this.getMany(filter, tx);
    return result;
  }

  async findOne<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(filter: StoreFilter<TEntity>, tx?: PgTxn) {
    const found = await this.getOne(filter, tx);
    if (found) return found;
    throw new Error(`Can not find record by filter: ${JSON.stringify(filter)}`);
  }

  async getPage<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(pageFilter: PageFilter<TEntity>, tx?: PgTxn): Promise<Page<TEntity>> {
    const executor = tx ? tx : this.db;
    const constraints = this.getConditionsFromFilter(pageFilter.filter);
    const orders: SQL<any>[] = [];
    if (pageFilter.order) {
      orders.push();
    }
    const [getCountResult] = await executor.select({ count: count() })
      .from(this.table)
      .where(constraints)
      .execute();
    const rawsCount = getCountResult!.count;
    const pageCount = Math.ceil(rawsCount / pageFilter.page.size);
    const nextIndex = (pageFilter.page.index + 1) < pageCount
      ? pageFilter.page.index + 1
      : null;
    const prevIndex = (pageFilter.page.index + 1) === 1
      ? null
      : pageFilter.page.index - 1;
    const result = await executor.select().from(this.table)
      .where(constraints)
      .orderBy(...this.getOrder(pageFilter.order))
      .limit(pageFilter.page.size)
      .offset(pageFilter.page.index * pageFilter.page.size)
      .execute();

    return {
      result: result as TEntity[],
      currentIndex: pageFilter.page.index,
      nextIndex: nextIndex,
      prevIndex: prevIndex,
      count: pageCount,
      recordsCount: rawsCount
    };
  }

  async deleteBy<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(filter: StoreFilter<TEntity>, tx?: PgTxn): Promise<{ id: string }[]> {
    const conditions = this.getConditionsFromFilter(filter);
    const executor = tx ? tx : this.db;
    const result = await executor.delete(this.table)
      .where(conditions)
      .returning({ id: this.table.id })
      .execute();
    return result as { id: string } [];
  }

  async update<
    TEntity extends TTable["$inferSelect"] = TTable["$inferSelect"]
  >(
    filter: Partial<TEntity>,
    values: Partial<TEntity>,
    tx?: PgTxn
  ): Promise<{ id: string }[]> {
    const executor = tx ? tx : this.db;
    const conditions = this.getConditionsFromFilter(filter);
    const result = await executor.update(this.table)
      .set(values)
      .where(conditions)
      .returning({ id: this.table["id"] })
      .execute();
    return result as { id: string }[];
  }

  private getConditionsFromFilter<
    T extends StoreFilter<Record<string, any>>
  >(filter: T) {
    const eqList: (ReturnType<typeof eq>)[] = [];
    const gtList: (ReturnType<typeof gt>)[] = [];
    const gteList: (ReturnType<typeof gte>)[] = [];
    const ltList: (ReturnType<typeof lt>)[] = [];
    const lteList: (ReturnType<typeof lte>)[] = [];
    for (const attributeName of Object.keys(filter)) {
      const constraint = filter[attributeName]!;
      if ("eq" in constraint && constraint.eq !== undefined) {
        eqList.push(eq(this.table[attributeName], constraint.eq));
      }
      if ("gt" in constraint && constraint.gt !== undefined) {
        gtList.push(gt(this.table[attributeName], constraint.gt));
      }
      if ("gte" in constraint && constraint.gte !== undefined) {
        gteList.push(gte(this.table[attributeName], constraint.gte));
      }
      if ("lt" in constraint && constraint.lt !== undefined) {
        ltList.push(lt(this.table[attributeName], constraint.lt));
      }
      if ("lte" in constraint && constraint.lte !== undefined) {
        lteList.push(lte(this.table[attributeName], constraint.lte));
      }
    }
    return and(...eqList, ...gtList, ...gteList, ...ltList, ...lteList);
  }

  private getOrder<T extends Record<string, any>>(
    order?: Required<PageFilter<T>>["order"]
  ) {
    if (!order) {
      return [];
    }
    const orderAsc: ReturnType<typeof asc>[] = [];
    if (order?.asc) {
      for (const key of order.asc) {
        orderAsc.push(asc((<any>this.table)[key]));
      }
    }
    const orderDesc: ReturnType<typeof desc>[] = [];
    if (order?.desc) {
      for (const key of order?.desc) {
        orderDesc.push((<any>this.table)[key]);
      }
    }
    return [...orderAsc, ...orderDesc];
  }
}
