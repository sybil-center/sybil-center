import { suite } from "uvu";
import { ZkCred } from "@sybil-center/zkc-core";
import { o1jsSybil } from "../src/index.js";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "o1js";
import * as a from "uvu/assert";

type PreparedAttr = [Field, Field, Field, Field, PublicKey];
type PreparedSign = [Signature, Field, PublicKey];

const test = suite("ZKC preparator tests");

const isrPrivateKey = PrivateKey.random();
const isrPublicKey = isrPrivateKey.toPublicKey();

const sbjPrivateKey = PrivateKey.random();
const sbjPublicKey = sbjPrivateKey.toPublicKey();

const poseidonHash = Poseidon.hash([Field(3), Field(4), Field(5), Field(0), ...sbjPublicKey.toFields()]);
const signature = Signature.create(isrPrivateKey, [poseidonHash]);


const cred: ZkCred = {
  proofs: [{
    type: "type",
    signature: {
      sign: signature.toBase58(),
      isr: {
        id: { t: 0, k: isrPublicKey.toBase58() }
      }
    },
    signatureSchemas: {
      default: {
        sign: ["mina:base58-signature", "mina:signature-fields"],
        isr: {
          id: {
            t: ["mina:uint16-field"],
            k: ["mina:base58-publickey", "mina:publickey-fields"]
          }
        }
      },
      pre: {
        sign: ["mina:base58-signature"],
        isr: {
          id: { t: ["mina:uint16-field"], k: ["mina:base58-publickey"] }
        }
      }
    },
    attributeSchemas: {
      default: {
        sch: ["mina:uint16-field"],
        isd: ["mina:uint16-field"],
        exd: ["mina:uint16-field"],
        sbj: {
          id: {
            t: ["mina:uint16-field"],
            k: ["mina:base58-publickey", "mina:publickey-fields"]
          }
        }
      },
      pre: {
        sch: ["mina:uint16-field"],
        isd: ["mina:uint16-field"],
        exd: ["mina:uint16-field"],
        sbj: {
          id: {
            t: ["mina:uint16-field"],
            k: ["mina:base58-publickey"]
          }
        }
      }
    }
  }],
  attributes: {
    sch: 3,
    isd: 4,
    exd: 5,
    sbj: {
      id: { t: 0, k: sbjPublicKey.toBase58() }
    }
  }
};

test("o1jsPreparator.prepareAttributes", () => {
  const [
    sch,
    isd,
    exd,
    isr_id_t,
    isr_id_k
  ] = o1jsSybil.getPreparator().getPreparedAttributes<PreparedAttr>(cred, {
    proof: { index: 0 },
    schema: "pre"
  });
  a.is(sch.toBigInt(), 3n, `cred attribute sch is not correct`);
  a.is(isd.toBigInt(), 4n, `cred attribute isd is not correct`);
  a.is(exd.toBigInt(), 5n, `cred attribute exd is not correct`);
  a.is(isr_id_t.toBigInt(), 0n, `cred attribute sbj_id_t is not correct`);
  a.is(isr_id_k.toBase58(), sbjPublicKey.toBase58(), `cred attribute sbj_id_k is not correct`);
});

test("o1jsPreparator.prepareSign", () => {
  const [
    sign,
    isr_id_t,
    isr_id_k
  ] = o1jsSybil.getPreparator().getPreparedSign<PreparedSign>(cred, {
    proof: { index: 0 },
    schema: "pre"
  });
  a.is(sign.toBase58(), signature.toBase58(), `signature sign attribute is not correct`);
  a.is(isr_id_t.toBigInt(), 0n, `signature isr_id_t attribute is not correct`);
  a.is(isr_id_k.toBase58(), isrPublicKey.toBase58(), `signature isr_id_k attribute is not correct`);
});

test("verify attributes & signature", () => {
  const [
    sign,
    isr_id_t,
    isr_id_k
  ] = o1jsSybil.getPreparator().getPreparedSign<PreparedSign>(cred, {
    proof: { index: 0 },
    schema: "pre"
  });
  a.is(isr_id_t.toBigInt(), 0n, `isr id type is not correct`);
  a.is(isr_id_k.toBase58(), isrPublicKey.toBase58(), `isr id key is not correct`);
  const preparedAttr = o1jsSybil.getPreparator().getPreparedAttributes<Field[]>(cred);
  const hash = Poseidon.hash(preparedAttr);
  a.is(hash.toBigInt(), poseidonHash.toBigInt(), `hash is not correct`);
  const verified = sign.verify(isr_id_k, [hash]).toBoolean();
  a.is(verified, true, `attributes is not verified`);
});

test("o1jsZKC.verify", async () => {
  const verified = await o1jsSybil.verifyCred({
    cred,
    signSelector: { proof: { index: 0 }, schema: "pre" }
  });
  a.is(verified, true, `signature is not verified`);
});

test.run();
