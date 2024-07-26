import { tokens } from "typed-inject";
import { JalCommentStore } from "../stores/jal-comment.store.js";
import { DbClient } from "../backbone/db-client.js";
import { JalCommentEntity, JalCommentEntityNew } from "../entities/jal-comment.entity.js";

export class JalCommentService {

  private readonly db;
  static inject = tokens("dbClient", "jalCommentStore");
  constructor(
    dbClient: DbClient,
    private readonly jalCommentStore: JalCommentStore
  ) {
    this.db = dbClient["db"];
  }

  async save(o: JalCommentEntityNew) {
    return await this.db.transaction(async (tx) => {
      const entity = await this.jalCommentStore.getOne({
        subjectId: o.subjectId,
        jalId: o.jalId
      }, tx);
      if (!entity) {
        return await this.jalCommentStore.save(o, tx);
      }
      if (entity.comment !== o.comment) {
        return await this.jalCommentStore.updateComment({
          subjectId: entity.subjectId,
          jalId: entity.jalId,
          comment: o.comment
        }, tx);
      }
      return { jalId: entity.jalId, subjectId: entity.subjectId };
    });
  }

  async getOne(o: Partial<JalCommentEntity>) {
    return await this.jalCommentStore.getOne(o);
  }
}