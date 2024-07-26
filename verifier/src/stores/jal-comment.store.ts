import { tokens } from "typed-inject";
import { DbClient } from "../backbone/db-client.js";
import { JalCommentEntity, JalCommentEntityNew } from "../entities/jal-comment.entity.js";
import { PgTxn } from "./eth-sybil.store.js";
import { and, eq, SQL } from "drizzle-orm";

export class JalCommentStore {

  private readonly db: DbClient["db"];

  static inject = tokens("dbClient");
  constructor(
    dbClient: DbClient
  ) {
    this.db = dbClient.db;
  }

  async save(o: JalCommentEntityNew, tx?: PgTxn) {
    const { subjectId } = o;
    const idSplit = subjectId.split(":");
    const [namespace, reference, publickey] = idSplit;
    if (!namespace || !reference || !publickey) {
      throw new Error(`Can not save jal program comment, invalid subject id representation`);
    }
    if (subjectId.startsWith("ethereum:address")) {
      o.subjectId = [namespace, reference, publickey.toLowerCase()].join(":");
    }
    if (idSplit.length !== 3) throw new Error(`Invalid subject id string representation`);
    const executor = tx ? tx : this.db;
    const [result] = await executor
      .insert(JalCommentEntity)
      .values(o)
      .returning({
        subjectId: JalCommentEntity.subjectId,
        jalId: JalCommentEntity.jalId
      })
      .execute();
    return result!;
  }

  async updateComment(
    { jalId, subjectId, comment }: Pick<JalCommentEntity, "comment" | "jalId" | "subjectId">,
    tx?: PgTxn
  ) {
    const executor = tx ? tx : this.db;
    await executor.update(JalCommentEntity)
      .set({ comment: comment })
      .where(and(
        eq(JalCommentEntity.jalId, jalId),
        eq(JalCommentEntity.subjectId, subjectId)
      ))
      .execute();
    return { jalId, subjectId };
  }

  async getOne(o: Partial<JalCommentEntity>, tx?: PgTxn) {
    const executor = tx ? tx : this.db;
    const equals: SQL[] = [];
    for (const key of Object.keys(o)) {
      //@ts-expect-error
      equals.push(eq(JalCommentEntity[key], o[key]));
    }
    const query = executor.select().from(JalCommentEntity);
    if (equals.length !== 0) {
      query.where(and(...equals));
    }
    const [result] = await query.execute();
    return result;
  }

  async findOne(o: Partial<JalCommentEntity>, tx?: PgTxn) {
    const result = await this.getOne(o, tx);
    if (result) return result;
    throw new Error(`Jal comment not found by filter ${JSON.stringify(o)}`);
  }
}