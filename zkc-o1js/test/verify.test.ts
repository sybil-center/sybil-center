import { suite } from "uvu";
import { PassportCred, Proved } from "@sybil-center/zkc-core";
import { zkcMina } from "../src/index.js";
import * as a from "uvu/assert";

const test = suite("ZKC verification tests");

test("verify ZKC", async () => {
  const zkCred: Proved<PassportCred> = {
    proof: [{
      key: "B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2",
      type: "Mina:PoseidonBaby2Jub",
      transformSchema: {
        isr: {
          id: {
            t: ["mina:uint64-field"],
            k: ["mina:base58-publickey", "mina:publickey-fields"]
          }
        },
        sch: ["mina:uint64-field"],
        isd: ["mina:uint128-field"],
        exd: ["mina:uint128-field"],
        sbj: {
          id: { "t": ["mina:uint64-field"], "k": ["mina:base58-publickey", "mina:publickey-fields"] },
          fn: ["utf8-bytes", "bytes-uint", "mina:uint-field.order", "mina:uint-field"],
          ln: ["utf8-bytes", "bytes-uint", "mina:uint-field.order", "mina:uint-field"],
          bd: ["mina:uint-field"],
          cc: ["mina:uint32-field"],
          doc: {
            t: ["mina:uint32-field"],
            id: ["utf8-bytes", "bytes-uint", "mina:uint-field.order", "mina:uint-field"]
          }
        }
      },
      sign: "7mXCJtXqbSdsSphwy2X7AEWAZiDkuqs1Shhr5U6FsWHYiBs7xJ3r8xVqnC2pR2cLs779S6mQmp6bWFyvYXN4XHphExQ9xksb"
    }],
    isr: {
      id: { t: 0, k: "B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2" }
    },
    sch: 0,
    isd: 1696067418720,
    exd: 0,
    sbj: {
      id: { t: 0, k: "B62qmMhhYwo5UT7pTgJXJ5aqKwy3mPcjp4j8K1gKu5XrmXQpAtCs8nv" },
      bd: 2446934400000,
      cc: 840,
      doc: { "id": "I1234562", "t": 2 },
      fn: "ALEXANDER J",
      ln: "SAMPLE"
    }
  };
  const verified = await zkcMina.verifyCred(zkCred);
  a.is(verified, true, "ZKC is verified");
});

test.run();
