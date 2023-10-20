import { IZkcSigner } from "../../types/zkc.signer.js";
import { Proved, ZkcId, ZkcIdType, ZkCred } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import * as u8a from "uint8arrays";
import { Preparator } from "@sybil-center/zkc-core";
import { sha256 } from "@noble/hashes/sha256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ZKC } from "../../../util/zk-credentials/index.js";


export class NoirECDSA implements IZkcSigner {

  constructor(
    config: { secp256k1PrivateKey: string },
    private readonly privateKey = u8a.fromString(config.secp256k1PrivateKey.toLowerCase(), "hex"),
    private readonly publicKey = secp256k1.getPublicKey(privateKey, false).slice(1, 65),
    private readonly preparator = new Preparator()
  ) {}

  get identifier(): { t: ZkcIdType, k: string } {
    return {
      t: 2,
      k: u8a.toString(this.publicKey, "hex")
    };
  }


  async signZkCred<TCred extends ZkCred = ZkCred>(
    props: Omit<TCred, "isr">,
    transSchema: TransCredSchema
  ): Promise<Proved<TCred>> {
    const sbjId: ZkcId = {
      t: props.sbj.id.t,
      k: props.sbj.id.k.startsWith("0x")
        ? props.sbj.id.k.replace("0x", "").toLowerCase()
        : props.sbj.id.k.toLowerCase()
    };
    const zkCred: ZkCred = {
      isr: { id: this.identifier },
      ...props,
      sbj: {
        ...props.sbj,
        id: sbjId
      }
    };
    // @ts-ignore
    const prepared = this.preparator.prepare<number[]>(zkCred, transSchema);
    const hash = sha256(new Uint8Array(prepared));
    const signature = (await secp256k1.sign(hash, this.privateKey)).toCompactRawBytes();
    return {
      proof: [
        {
          key: u8a.toString(this.publicKey, "hex"),
          type: "Noir:Sha256Secp256k1",
          transformSchema: transSchema,
          sign: u8a.toString(signature, "hex"),
        }
      ],
      ...ZKC.sortCred<TCred>(zkCred as TCred),
    };
  }
}
