import { suite } from "uvu";
import { PassportCred, Proved, zkcUtil } from "@sybil-center/zkc-core";
import { Experimental, Field, Poseidon, PublicKey, Signature, Struct, UInt64, verify } from "o1js";
import { o1jsPreparator, zkcMina } from "../src/index.js";
import * as a from "uvu/assert";

const test = suite("ZKC verification tests");

type Prepared = [
  Field,
  PublicKey,
  Field,
  Field,
  Field,
  Field,
  PublicKey,
  Field,
  Field,
  Field,
  Field,
  Field,
  Field
];

const FROM_1900_TO_1970_MS = -(new Date("1900-01-01T00:00:00.000Z").getTime());

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

test("Verify by ZKP", async () => {

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

  const {
    cred,
    proof: {
      sign: signature,
      transformSchema
    }
  } = zkcUtil.from(zkCred).credAndProof();

  transformSchema.isr.id.k.pop();
  transformSchema.sbj.id.k.pop();

  const prepared = o1jsPreparator.prepare<Prepared>(cred, transformSchema);

  class VerifyInputs extends Struct({
    subject: PublicKey,
    today: UInt64,
  }) {}

  const now = new Date();
  const todayFrom1900 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + FROM_1900_TO_1970_MS;
  const u19Now = UInt64.from(todayFrom1900);
  const year18MS = UInt64.from(364 * 24 * 60 * 60);
  const zkVerifier = Experimental.ZkProgram({
    publicInput: VerifyInputs,
    methods: {
      verifyCred: {
        privateInputs: [
          Signature,
          Field,
          PublicKey,
          Field,
          Field,
          Field,
          Field,
          PublicKey,
          Field,
          Field,
          Field,
          Field,
          Field,
          Field
        ],
        method(
          verifyInputs: VerifyInputs,
          signature: Signature,
          isr_id_t: Field,
          isr_id_k: PublicKey,
          sch: Field,
          isd: Field,
          exd: Field,
          sbj_id_t: Field,
          sbj_id_k: PublicKey,
          sbj_bd: Field,
          sbj_cc: Field,
          sbj_doc_id: Field,
          sbj_doc_t: Field,
          sbj_fn: Field,
          sbj_ln: Field
        ) {

          verifyInputs.subject.assertEquals(sbj_id_k);
          verifyInputs.today.sub(year18MS).assertGte(UInt64.from(sbj_bd));
          sbj_cc.assertEquals(new Field(840));
          sbj_doc_t.assertEquals(new Field(2));
          const hash = Poseidon.hash([
            isr_id_t, ...isr_id_k.toFields(),
            sch, isd, exd,
            sbj_id_t, ...sbj_id_k.toFields(),
            sbj_bd,
            sbj_cc, sbj_doc_id,
            sbj_doc_t, sbj_fn, sbj_ln
          ]);
          const verified = signature.verify(isr_id_k, [hash]);
          verified.assertTrue();
        }
      }
    }
  });
  console.log("Start compiling zk program");
  const { verificationKey } = await zkVerifier.compile();
  console.log("Create zk proof");
  const proof = await zkVerifier.verifyCred(
    new VerifyInputs({
      today: u19Now,
      subject: prepared[6]
    }),
    Signature.fromBase58(signature),
    ...prepared
  );
  console.log("proof", proof.toJSON());
  console.log("verify zk proof");
  const verified = await verify(proof.toJSON(), verificationKey);
  a.is(verified, true, "ZK proof is not verified");
});

test("", () => {
  a.is(UInt64.from(new Field(1)).toBigInt(), 1n);
});

test.run();
