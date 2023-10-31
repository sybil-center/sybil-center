import { suite } from "uvu";
import { Preparator, type ZkCred } from "../src/index.js";
import * as a from "uvu/assert";

const test = suite("Preparator tests");


const zkCred: ZkCred = {
  proofs: [
    {
      id: "id:1",
      signature: "0",
      issuer: { id: { t: 1, k: "2" } },
      type: "type:1",
      schemas: {
        default: {
          sign: ["utf8-bytes"],
          isr: {
            id: {
              t: ["uint16-bytes"],
              k: ["utf8-bytes"]
            }
          },
          sch: ["uint16-bytes"],
          isd: ["uint16-bytes"],
          exd: ["uint16-bytes"],
          sbj: {
            id: {
              t: ["uint16-bytes"],
              k: ["utf8-bytes"],
            },
            hello: ["utf8-bytes"]
          }
        },
        pre: {
          sign: ["utf8"],
          isr: {
            id: {
              t: ["uint16"],
              k: ["utf8"]
            }
          },
          sch: ["uint16"],
          isd: ["uint16"],
          exd: ["uint16"],
          sbj: {
            id: {
              t: ["uint16"],
              k: ["utf8"],
            },
            hello: ["utf8"]
          }
        }
      }
    },
    {
      id: "id:2",
      signature: "1",
      issuer: { id: { t: 2, k: "3" } },
      type: "type:2",
      schemas: {
        default: {
          sign: ["utf8-uint"],
          isr: {
            id: {
              t: ["uint16"],
              k: ["utf8-uint16"]
            }
          },
          sch: ["uint16"],
          isd: ["uint16"],
          exd: ["uint16"],
          sbj: {
            id: {
              t: ["uint16"],
              k: ["utf8-uint16"],
            },
            hello: ["utf8-uint256"]
          }
        }
      }
    }
  ],
  attributes: {
    sch: 3,
    isd: 4,
    exd: 5,
    sbj: {
      id: {
        t: 6,
        k: "7"
      },
      hello: "8"
    }
  }
};

test("preparator.prepare", () => {
  const preparator = new Preparator();
  const preapared = preparator.prepare<[
    bigint,
    string,
    bigint,
    bigint,
    bigint,
    string,
    string,
    bigint
  ]>({
    issuer: {
      id: { t: 1, k: "2" }
    },
    signature: "1",
    attributes: {
      exd: 5,
      isd: 4,
      sch: 3,
      sbj: {
        id: { t: 6, k: "7" },
        doc: "hello"
      },
    },
    transSchema: {
      sign: ["base58-bytes", "bytes-uint16"],
      isd: ["uint16-bytes", "bytes-uint128"],
      exd: ["uint16-bytes", "bytes-hex"],
      sch: ["uint16-bytes", "bytes-base58", "base58-bytes", "bytes-uint"],
      sbj: {
        id: {
          k: ["utf8-uint16"],
          t: ["uint16-bytes", "bytes-utf8"],
        },
        doc: ["utf8-bytes", "bytes-uint"]
      },
      isr: {
        id: {
          t: ["uint-bytes", "bytes-uint", "uint-utf8"],
          k: ["utf8-uint32"]
        }
      },
    }
  });
  a.equal(preapared, [0n, "1", 2n, 3n, 4n, "0005", "\u0000\u0006", 7n, 448378203247n]);
});

test("preparator.prepareCred default", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred(zkCred);
  prepared.forEach((it) => {
    a.is(typeof it === "number", true);
  });
});

test("preparator.prepareCred select by index", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred<bigint[]>(zkCred, { proof: { index: 1 } });
  a.equal(prepared, [
    1n, 2n, 3n, 3n, 4n,
    5n, 6n, 7n, 8n
  ]);
});

test("preparator.prepareCred select by id", () => {
  const preparator = new Preparator();
  const preparedFirst = preparator.prepareCred(zkCred, { proof: { id: "id:1" } });
  preparedFirst.forEach((it) => a.is(typeof it === "number", true));
  const preparedSecond = preparator.prepareCred(zkCred, { proof: { id: "id:2" } });
  a.equal(preparedSecond, [
    1n, 2n, 3n, 3n, 4n,
    5n, 6n, 7n, 8n
  ]);
});

test("preparator.prepareCred select by type", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred(zkCred, { proof: { type: "type:2" } });
  a.equal(prepared, [
    1n, 2n, 3n, 3n, 4n,
    5n, 6n, 7n, 8n
  ]);
});

test("preparator.prepareCred select by issuer", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred(zkCred, {
    proof: {
      issuer: {
        id: { t: 2, k: "3" }
      }
    }
  });
  a.equal(prepared, [
    1n, 2n, 3n, 3n, 4n,
    5n, 6n, 7n, 8n
  ]);
});

test("preparator.prepareCred select type & schema", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred(zkCred, {
    proof: { type: "type:1" },
    schema: "pre"
  });
  a.equal(prepared, [
    "0", 1n, "2", 3n,
    4n, 5n, 6n, "7",
    "8"
  ]);
});

test("preparator.prepareCred select by schema & index", () => {
  const preparator = new Preparator();
  const prepared = preparator.prepareCred(zkCred, {
    schema: "pre",
    proof: { index: 0 }
  });
  a.equal(prepared, [
    "0", 1n, "2", 3n,
    4n, 5n, 6n, "7",
    "8"
  ]);
});

test.run();