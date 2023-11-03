import { suite } from "uvu";
import { Preparator, type ZkCred } from "../src/index.js";
import * as a from "uvu/assert";

const test = suite("Preparator tests");


const zkCred: ZkCred = {
  proofs: [
    {
      id: "id:1",
      signature: {
        sign: "0",
        isr: { id: { t: 1, k: "2" } }
      },
      signatureSchemas: {
        default: {
          isr: {
            id: { t: ["uint16-bytes"], k: ["utf8-bytes"] }
          },
          sign: ["utf8-bytes"],
        },
        pre: {
          isr: { id: { t: ["uint16"], k: ["utf8"] } },
          sign: ["utf8"]
        }
      },
      type: "type:1",
      attributeSchemas: {
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
      type: "type:2",
      signature: {
        isr: { id: { t: 2, k: "3" } },
        sign: "1"
      },
      signatureSchemas: {
        default: {
          isr: { id: { t: ["uint16"], k: ["utf8"] } },
          sign: ["utf8"],
        }
      },
      attributeSchemas: {
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
      hello: "8",
      id: {
        t: 6,
        k: "7"
      },
    }
  }
};

test("Preparator.prepareSign by default selector", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred);
  prepared.forEach((it) => a.is(typeof it === "number", true));
});

test("Preparator.prepareSign select by index", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred, {
    proof: { index: 1 }
  });
  a.equal(prepared, ["1", 2n, "3"]);
});

test("Preparator.prepareSign select by proofType", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred, {
    proof: { type: "type:2" }
  });
  a.equal(prepared, ["1", 2n, "3"]);
});

test("Preparator.prepareSign select by issuer id", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred, {
    proof: { issuer: { id: { t: 2, k: "3" } } }
  });
  a.equal(prepared, ["1", 2n, "3"]);
});

test("Preparator.prepareSIgn select by type & issuer", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred, {
    proof: {
      issuer: { id: { t: 2, k: "3" } },
      type: "type:2"
    }
  });
  a.equal(prepared, ["1", 2n, "3"]);
  a.throws(() => {
    preparator.getPreparedSign(zkCred, {
      proof: {
        issuer: { id: { t: 2, k: "invalid" } },
        type: "type:2"
      }
    });
  });
});

test("Preparator.prepareSing select by schema name", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedSign(zkCred, {
    proof: { index: 0 },
    schema: "pre"
  });
  a.equal(prepared, ["0", 1n, "2"]);
  a.throws(() => {
    preparator.getPreparedSign(zkCred, {
      proof: { index: 0 },
      schema: "invalid"
    });
  });
});

test("Preparator.prepareAttributes select by default", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedAttributes(zkCred);
  prepared.forEach((it) => a.is(typeof it === "number", true));
});

test("Preparator.prepareAttributes select by issuer", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedAttributes(zkCred, {
    proof: {
      issuer: { id: { t: 2, k: "3" } },
    }
  });
  a.equal(prepared, [3n, 4n, 5n, 6n, 7n, 8n]);
  a.throws(() => {
    preparator.getPreparedAttributes(zkCred, {
      proof: {
        issuer: { id: { t: 2, k: "invalid" } }
      }
    });
  });
});

test("Preparator.prepareAttributes select by issuer & type", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedAttributes(zkCred, {
    proof: {
      issuer: { id: { t: 2, k: "3" } },
      type: "type:2"
    }
  });
  a.equal(prepared, [3n, 4n, 5n, 6n, 7n, 8n]);
  a.throws(() => {
    preparator.getPreparedAttributes(zkCred, {
      proof: {
        issuer: { id: { t: 5, k: "invalid" } },
        type: "type:2"
      }
    });
  });
});

test("Preparator.prepareAttributes select by schema name", () => {
  const preparator = new Preparator();
  const prepared = preparator.getPreparedAttributes(zkCred, {
    proof: { index: 0 },
    schema: "pre"
  });
  a.equal(prepared, [3n, 4n, 5n, 6n, "7", "8"]);
  a.throws(() => {
    preparator.getPreparedAttributes(zkCred, {
      proof: { index: 0 },
      schema: "invalid"
    });
  });
});

test.run();