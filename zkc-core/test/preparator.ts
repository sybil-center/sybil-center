import { suite } from "uvu";
import * as a from "uvu/assert";
import { TransCredSchema, ZkCred } from "../src/index.js";
import { Preparator } from "../src/preparator/index.js";

const test = suite("Preparator tests");

const zkCredential: ZkCred = {
  isr: {
    // @ts-ignore
    id: { t: 1, k: "123456" }
  },
  sch: 1,
  isd: new Date().getTime(),
  exd: new Date().getTime(),
  sbj: {
    // @ts-ignore
    id: { k: "2345678", t: 2, },
    eth: "0x2...3",
    alias: "Test",
  }
};


test("prepare zk-credential", () => {
  const transSchema = {
    isr: {
      id: {
        t: ["uint32-bytes", "bytes-uint32", "uint32-boolean"],
        k: ["utf8-bytes"]
      },
    },
    sch: ["uint32-bytes", "bytes-base16"],
    isd: ["uint64-bytes", "bytes-base32"],
    exd: ["uint64-bytes", "bytes-utf8"],
    sbj: {
      id: {
        t: ["uint32-bytes"],
        k: ["utf8-bytes", "bytes-base16"]
      },
      alias: ["ascii-bytes", "bytes-uint128"],
      eth: ["utf8-bytes", "bytes-uint256"]
    }
  };
  const pr = new Preparator();
  const [
    isr_id_t,
    isr_id_k,
    sch,
    isd,
    exd,
    sbj_id_t,
    sbj_id_k,
    alias,
    eth
  ] = pr.prepare(zkCredential, transSchema);
  a.is(
    isr_id_t, true,
    `Incorrect preparation of ZKCredential.isr.id.t`
  );
  a.instance(
    isr_id_k, Uint8Array,
    `Incorrect preparation of ZKCredential.isr.id.k`
  );
  a.type(
    sch, "string",
    `Incorrect preparation of ZKCredential.sch`
  );
  a.type(
    isd, "string",
    `Incorrect preparation of ZKCredential.isd`
  );
  a.type(
    exd, "string",
    `Incorrect preparation of ZKCredential.exd`
  );
  a.instance(
    sbj_id_t, Uint8Array,
    `Incorrect preparation of ZKCredential.sbj.id.t`
  );
  a.type(
    sbj_id_k, "string",
    `Incorrect preparation of ZKCredential.sbj.id.k`
  );
  a.type(
    //@ts-ignore
    alias, "bigint",
    `Incorrect preparation of ZKCredential.sbj.alias`
  );
  a.type(
    //@ts-ignore
    eth, "bigint",
    `Incorrect preparation of ZKCredential.sbj.eth`);
});

test("extend transformation graph", () => {
  const preparator = new Preparator();
  preparator.extendGraph([], [{
    inputType: "bytes",
    outputType: "bytes",
    name: "bytes.reverse",
    transform: (bytes: Uint8Array) => bytes.reverse()
  }]);
  const transSchema: TransCredSchema = {
    isr: {
      id: {
        t: ["uint32-bytes", "bytes-uint32", "uint32-boolean"],
        k: ["utf8-bytes", "bytes.reverse"]
      },
    },
    sch: ["uint32-bytes", "bytes-base16"],
    isd: ["uint64-bytes", "bytes-base32"],
    exd: ["uint64-bytes", "bytes-utf8"],
    sbj: {
      id: {
        t: ["uint32-bytes"],
        k: ["utf8-bytes", "bytes-base16"]
      },
      alias: ["ascii-bytes", "bytes-uint128"],
      eth: ["utf8-bytes", "bytes-uint256"]
    }
  };
  const [
    isr_id_t,
    isr_id_k,
    sch,
    isd,
    exd,
    sbj_id_t,
    sbj_id_k,
    alias,
    eth
  ] = preparator.prepare(zkCredential, transSchema);
  a.is(
    isr_id_t, true,
    `Incorrect preparation of ZKCredential.isr.id.t`
  );
  a.instance(
    isr_id_k, Uint8Array,
    `Incorrect preparation of ZKCredential.isr.id.k`
  );
  a.type(
    sch, "string",
    `Incorrect preparation of ZKCredential.sch`
  );
  a.type(
    isd, "string",
    `Incorrect preparation of ZKCredential.isd`
  );
  a.type(
    exd, "string",
    `Incorrect preparation of ZKCredential.exd`
  );
  a.instance(
    sbj_id_t, Uint8Array,
    `Incorrect preparation of ZKCredential.sbj.id.t`
  );
  a.type(
    sbj_id_k, "string",
    `Incorrect preparation of ZKCredential.sbj.id.k`
  );
  a.type(
    //@ts-ignore
    alias, "bigint",
    `Incorrect preparation of ZKCredential.sbj.alias`
  );
  a.type(
    //@ts-ignore
    eth, "bigint",
    `Incorrect preparation of ZKCredential.sbj.eth`);
});

test("spread some properties", () => {
  const issuanceDate = new Date().getTime();
  const expirationDate = new Date().getTime();
  const preparator = new Preparator();
  preparator.extendGraph([
    {
      name: "string.splited",
      spread: true,
      isType: (value: any) => {
        return Array.isArray(value) && value.length === 2;
      }
    }
  ], [{
    name: "str:utf8-string.splited",
    inputType: "utf8",
    outputType: "string.splited",
    transform: (value: string): [string, string] => {
      return value.split(".") as [string, string];
    }
  }]);

  const zkCredential: ZkCred = {
    isr: {// @ts-ignore
      id: { t: 1, k: "123456" }
    },
    sch: 1,
    isd: issuanceDate,
    exd: expirationDate,
    sbj: { // @ts-ignore
      id: { t: 1, k: "123456" },
      text: "hello.world"
    }
  };

  const transSchema: TransCredSchema = {
    isr: {
      id: { t: ["uint32"], k: ["utf8"] }
    },
    sch: ["uint32"],
    isd: ["uint128"],
    exd: ["uint128"],
    sbj: {
      id: { t: ["uint32"], k: ["utf8"] },
      text: ["str:utf8-string.splited"]
    }
  };

  const [
    isr_id_t,
    isr_id_k,
    sch,
    isd,
    exd,
    sbj_id_t,
    sbj_id_k,
    text_hello,
    text_world
  ] = preparator.prepare(zkCredential, transSchema);

  a.is(isr_id_t, 1n, `Incorrect preparation of ZKCredential.isr.id.t`);
  a.is(isr_id_k, "123456", `Incorrect preparation of ZKCredential.isr.id.k`);
  a.is(sch, 1n, `Incorrect preparation of ZKCredential.sch`);
  a.is(isd, BigInt(issuanceDate), `Incorrect preparation of ZKCredential.isd`);
  a.is(exd, BigInt(expirationDate), `Incorrect preparation of ZKCredential.exd`);
  a.is(sbj_id_t, 1n, `Incorrect preparation of ZKCredential.sbj.id.t`);
  a.is(sbj_id_k, "123456", `Incorrect preparation of ZKCredential.sbj.id.k`);
  a.is(text_hello, "hello", `Incorrect preparation of ZKCredential.sbj.text[0]`);
  a.is(text_world, "world", `Incorrect preparation of ZKCredential.sbj.text[1]`)
});

test.run();
