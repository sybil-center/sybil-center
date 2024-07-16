import { suite } from "uvu";
import { App } from "../../../../src/app.js";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../test-util/index.js";
import { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { DbClient } from "../../../../src/backbone/db-client.js";
import { JalEntity } from "../../../../src/entities/jal.entity.js";
import { assert, Const, greaterOrEqual, mul, Static, sub, toJAL } from "@jaljs/js-zcred";
import { DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA } from "@sybil-center/passport";
import { O1GraphLink } from "o1js-trgraph";
import * as a from "uvu/assert";
import { JalProgram } from "@jaljs/core";
import sortKeys from "sort-keys";
import { JalService } from "../../../../src/services/jal.service.js";

let app: App;
let db: DbClient["db"];
let fastify: FastifyInstance;
let jalService: JalService;

const test = suite("JAL controller test");


test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  db = app.context.resolve("dbClient").db;
  jalService = app.context.resolve("jalService");
});

test.after(async () => {
  while (!app) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await db.delete(JalEntity).execute();
  await app.close();
});

test("create jal program", async () => {

  const {
    credential,
    context
  } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
  const attributes = credential.attributes;
  const jalProgram = toJAL({
    target: "o1js:zk-program.cjs",
    credential: credential,
    publicInput: [
      attributes.subject.id.type,
      attributes.subject.id.key,
      attributes.document.sybilId,
      context.now
    ],
    commands: [
      assert(
        greaterOrEqual(
          sub(context.now, attributes.subject.birthDate),
          mul(Static<O1GraphLink>(18, ["uint64-mina:field"]), Const("year"))
        )
      )
    ],
    options: {
      signAlgorithm: "mina:pasta",
      hashAlgorithm: "mina:poseidon"
    }
  });
  const createJalResp = await fastify.inject({
    method: "POST",
    path: "/api/v1/jal",
    payload: jalProgram,
  });
  a.is(
    createJalResp.statusCode, 200,
    `Create JAL resp status code is not 200. Resp body: ${createJalResp.body}`
  );
  const { id } = JSON.parse(createJalResp.body) as Pick<JalEntity, "id">;
  a.is(id, toJalEntityId(jalProgram), `Invalid JAL entity id`);
  const jalEntity = await jalService.findById(id);
  a.equal(jalEntity.program, jalProgram, "Invalid saved jal program");
});

test.run();


function toJalEntityId(jalProgram: JalProgram): string {
  const sorted = sortKeys(jalProgram, { deep: true });
  return crypto.createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex");
}