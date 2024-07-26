import { JalStore } from "../stores/jal.store.js";
import { tokens } from "typed-inject";
import { JalProgram } from "@jaljs/core";
import { ZkProgramTranslator } from "@jaljs/o1js";
import { DbClient } from "../backbone/db-client.js";
import * as o1js from "o1js";
import { JalCommentService } from "./jal-comment.service.js";
import { Identifier } from "@zcredjs/core";

type SaveWithComment = {
  jalProgram: JalProgram;
  comment: string;
  subject: {
    id: Identifier
  }
}

export class JalService {

  private readonly db: DbClient["db"];

  static inject = tokens("dbClient", "jalStore", "jalCommentService");
  constructor(
    dbClient: DbClient,
    private readonly jalStore: JalStore,
    private readonly jalCommentService: JalCommentService
  ) {
    this.db = dbClient.db;
  }

  async save(jalProgram: JalProgram) {
    if (jalProgram.target === "o1js:zk-program.cjs") {
      // check that JAL program is ok
      new ZkProgramTranslator(o1js).translate(jalProgram);
    } else {
      throw new Error("Invalid JAL program target");
    }
    const { id } = await this.db.transaction(async (tx) => {
      const found = await this.jalStore.getByProgram(jalProgram, tx);
      if (found) return found;
      return await this.jalStore.save(jalProgram, tx);
    });
    return { id };
  }

  async saveWithComment(o: SaveWithComment) {
    const { id: jalId } = await this.save(o.jalProgram);
    const subjectId = `${o.subject.id.type}:${o.subject.id.key}`;
    await this.jalCommentService.save({
      subjectId: subjectId,
      jalId: jalId,
      comment: o.comment
    });
    return { id: jalId };
  }

  async getById(id: string) {
    return await this.jalStore.getById(id);
  }

  async findById(id: string) {
    return await this.jalStore.findById(id);
  }
}