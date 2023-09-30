import { suite } from "uvu";
import { PassportCred, Proved, zkcUtil } from "@sybil-center/zkc-core";
import { o1jsPreparator, zkcMina } from "../src/index.js";
import { Field, PublicKey } from "o1js";
import * as a from "uvu/assert";

type Prepared = [Field, PublicKey, Field, Field, Field, Field, PublicKey, Field, Field, Field, Field, Field, Field]

const test = suite("ZKC preparator tests");

test("test preparator", () => {
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
  zkCred.proof[0]?.transformSchema.isr.id.k.pop();
  zkCred.proof[0]?.transformSchema.sbj.id.k.pop();
  const transSchema = zkcUtil.from(zkCred).proof().transformSchema;
  const [
    isr_id_t,
    isr_id_k,
    sch,
    isd,
    exd,
    sbj_id_t,
    sbj_id_k,
    sbj_bd,
    sbj_cc,
    sbj_doc_id,
    sbj_doc_t,
    sbj_fn,
    sbj_ln
  ] = zkcMina.prepare<Prepared>(zkCred);
  a.is(
    isr_id_t.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.isr.id.t, transSchema.isr.id.t).toBigInt(),
    "ZKC issuer id type is not matched"
  );
  a.instance(isr_id_k, PublicKey, `ZKC issuer id key is not mina public key`);
  a.is(
    isr_id_k.toBase58(),
    o1jsPreparator.transform<PublicKey>(zkCred.isr.id.k, transSchema.isr.id.k).toBase58(),
    "ZKC issuer id key is not matched"
  );
  a.is(
    sch.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sch, transSchema.sch).toBigInt(),
    "ZKC schema is not matched"
  );
  a.is(
    isd.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.isd, transSchema.isd).toBigInt(),
    "ZKC issuance date is not matched"
  );
  a.is(
    exd.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.exd, transSchema.exd).toBigInt(),
    "ZKC expiration date is not matched"
  );
  a.is(
    sbj_id_t.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.id.t, transSchema.sbj.id.t).toBigInt(),
    "ZKC subject id type is not matched"
  );
  a.is(
    sbj_id_k.toBase58(),
    o1jsPreparator.transform<PublicKey>(zkCred.sbj.id.k, transSchema.sbj.id.k).toBase58(),
    "ZKC subject id key is not matched"
  );
  a.is(
    sbj_bd.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.bd, transSchema.sbj!["bd"]).toBigInt(),
    "ZKC subject birthdate is not matched"
  );
  a.is(
    sbj_cc.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.cc, transSchema.sbj!["cc"]).toBigInt(),
    "ZKC subject country code is not matched"
  );
  a.is(
    sbj_doc_id.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.doc.id, transSchema.sbj!["doc"]["id"]).toBigInt(),
    "ZKC subject document id is not matched"
  );
  a.is(
    sbj_doc_t.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.doc.t, transSchema.sbj!["doc"]["t"]).toBigInt(),
    "ZKC subject document type is not matched"
  );
  a.is(
    sbj_fn.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.fn, transSchema.sbj!["fn"]).toBigInt(),
    "ZKC subject first name is not matched"
  );
  a.is(
    sbj_ln.toBigInt(),
    o1jsPreparator.transform<Field>(zkCred.sbj.ln, transSchema.sbj!["ln"]).toBigInt(),
    "ZKC subject last name is not matched"
  );
});

test.run();
