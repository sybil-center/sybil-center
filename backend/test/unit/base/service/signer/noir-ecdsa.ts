import { suite } from "uvu";
import { NoirECDSA } from "../../../../../src/base/service/signers/noir-ecdsa.js";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import * as u8a from "uint8arrays";
import { PassportCred, Preparator, TransCredSchema } from "@sybil-center/zkc-core";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";
import * as a from "uvu/assert";


const test = suite("UNIT: noir ECDSA signer test");

const FROM_1900_TO_1970_MS = -(new Date("1900-01-01T00:00:00.000Z").getTime());

const zkCredProps: Omit<PassportCred, "isr"> = {
  sch: 2,
  isd: 1696790497147,
  exd: 0,
  sbj: {
    id: {
      // @ts-ignore
      t: 1, // ethereum address
      k: ethereumSupport.info.ethereum.address.replace("0x", "").toLowerCase()
    },
    fn: "Alice",
    ln: "Test",
    bd: FROM_1900_TO_1970_MS + new Date(2000, 1, 1).getTime(),
    cc: 840,
    doc: {
      t: 1,
      id: "I123123K"
    }
  }
};

const transSchema: TransCredSchema = {
  isr: {
    id: {
      t: ["uint16-bytes"],
      k: ["hex-bytes"], // secp256k1 public key length is 64 bytes
    }
  },
  sch: ["uint16-bytes"],
  isd: ["uint64-bytes"],
  exd: ["uint64-bytes"],
  sbj: {
    id: {
      t: ["uint16-bytes"],
      k: ["hex-bytes"] // ethereum address length is 20 bytes
    },
    bd: ["uint64-bytes"],
    cc: ["uint16-bytes"],
    fn: [
      "utf8-bytes",
      "bytes-uint",
      "mod.uint128",
      "uint128-bytes"
    ],
    ln: [
      "utf8-bytes",
      "bytes-uint",
      "mod.uint128",
      "uint128-bytes"
    ],
    doc: {
      t: ["uint16-bytes"],
      id: ["utf8-bytes", "bytes-uint", "mod.uint256", "uint256-bytes"]
    }
  }
};

test("Correct sign zk credential", async () => {
  const issuerPrivateKey = secp256k1.utils.randomPrivateKey();
  const issuerPublicKey = secp256k1.getPublicKey(issuerPrivateKey, false).slice(1, 65);
  const privateKey = u8a.toString(issuerPrivateKey, "hex");
  const signer = new NoirECDSA({ secp256k1PrivateKey: privateKey });
  const zkCredProved = await signer.signZkCred(zkCredProps, transSchema);
  const prepared = new Preparator().prepare<number[]>({
    isr: {
      id: {
        // @ts-ignore
        t: 2,
        k: u8a.toString(issuerPublicKey, "hex")
      }
    },
    ...zkCredProps
  }, transSchema);
  const hash = sha256(new Uint8Array(prepared));
  const sign = (await secp256k1.sign(hash, issuerPrivateKey)).toCompactRawBytes();
  const signHex = u8a.toString(sign, "hex");
  a.is(zkCredProved.proof[0]?.sign, signHex, `ZKC signatures is not matched`);
  a.is(zkCredProved.proof[0]?.key, u8a.toString(issuerPublicKey, "hex"), `Issuer public key is not matched`);
  const verified = await secp256k1.verify(signHex, hash, `04${u8a.toString(issuerPublicKey, "hex")}`);
  a.is(verified, true);
});

test.run();
