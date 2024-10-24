import { tokens } from "typed-inject";
import { JalCommentStore } from "../stores/jal-comment.store.js";
import { DbClient } from "../backbone/db-client.js";
import { JalCommentEntity, JalCommentEntityNew } from "../models/entities/jal-comment.entity.js";

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
        clientId: o.clientId,
        jalId: o.jalId
      }, tx);
      if (!entity) {
        return await this.jalCommentStore.save(o, tx);
      }
      if (entity.comment !== o.comment) {
        return await this.jalCommentStore.updateComment({
          clientId: entity.clientId,
          jalId: entity.jalId,
          comment: o.comment
        }, tx);
      }
      return { jalId: entity.jalId, clientId: entity.clientId };
    });
  }

  async getOne(o: Partial<JalCommentEntity>) {
    return await this.jalCommentStore.getOne(o);
  }
}