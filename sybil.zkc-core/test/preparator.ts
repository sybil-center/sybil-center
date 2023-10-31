import { suite } from "uvu";
import * as a from "uvu/assert";
import { Preparator, TransCredSchema, ZkCred } from "../src/index.js";

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
        k: ["utf8-bytes", "bytes-uint128"]
      },
    },
    sch: ["uint32-bytes", "bytes-base16"],
    isd: ["uint64-bytes", "bytes-base32"],
    exd: ["uint64-bytes", "bytes-utf8"],
    sbj: {
      id: {
        t: ["uint32-bytes", "bytes-uint32"],
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
  a.is(
    isr_id_k, 54091677185334n, `Incorrect preparation of ZKCredential.isr.id.k`
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
  a.is(sbj_id_t, 2n, `Incorrect preparation of ZKCredential.sbj.id.t`);
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
        k: ["utf8-bytes", "bytes.reverse", "bytes-uint"]
      },
    },
    sch: ["uint32-bytes", "bytes-base16"],
    isd: ["uint64-bytes", "bytes-base32"],
    exd: ["uint64-bytes", "bytes-utf8"],
    sbj: {
      id: {
        t: ["uint32-bytes", "bytes-uint64"],
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
  a.is(isr_id_k, 59602136937009n, `Incorrect preparation of ZKCredential.isr.id.k`);
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
  a.is(sbj_id_t, 2n, `Incorrect preparation of ZKCredential.sbj.id.t`);
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
  a.is(text_world, "world", `Incorrect preparation of ZKCredential.sbj.text[1]`);
});

test("all to bytes", () => {
  const cred: ZkCred = {
    isr: { id: { t: 0, k: "FFFF" } },
    sch: 2,
    isd: 1696781360,
    exd: 0,
    sbj: {
      id: {
        // @ts-ignore
        t: 1,
        k: "FF"
      }
    }
  };
  const transSchema: TransCredSchema = {
    isr: {
      id: {
        t: ["uint32-bytes"],
        k: ["base16-bytes", "bytes-uint128", "uint128-bytes"],
      }
    },
    sch: ["uint16-bytes"],
    isd: ["uint64-bytes"],
    exd: ["uint64-bytes"],
    sbj: {
      id: {
        t: ["uint32-bytes"],
        k: ["base16-bytes", "bytes-uint128", "uint128-bytes"]
      },
    }
  };
  const preparator = new Preparator();
  const prepared = preparator.prepare<number[]>(cred, transSchema);
  a.is(prepared.length, 58, `Prepared bytes length is not correct`);
  const isr_id_t = prepared.slice(0, 4);
  const isr_id_k = prepared.slice(4, 4 + 16);
  const sch = prepared.slice(20, 20 + 2);
  const isd = prepared.slice(22, 22 + 8);
  const exd = prepared.slice(30, 30 + 8);
  const sbj_id_t = prepared.slice(38, 38 + 4);
  const sbj_id_k = prepared.slice(42, 58);
  a.equal(isr_id_t, [0, 0, 0, 0], `Issuer id type is not matched`);
  a.equal(isr_id_k,
    [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 255, 255
    ], "Issuer id key is not matched"
  );
  a.equal(sch, [0, 2], "Issuer schema not matched");
  a.equal(
    isd,
    [
      0, 0, 0, 0,
      101, 34, 212, 48
    ], "Issuance date is not matched");
  a.equal(
    exd, new Array(8).fill(0),
    "Expiration date is not matched"
  );
  a.equal(sbj_id_t, [0, 0, 0, 1], "Subject id type is not matched");
  a.equal(
    sbj_id_k,
    [
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0,
      0, 0, 0, 255
    ],
    "Subject id key is not matched"
  );
});

test.run();
