import { tokens } from "typed-inject";
import { Config } from "../../../backbone/config.js";
import { ZkCredential, ZkCredProofed } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { zkc } from "../../../util/zk-credentials.util.js";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "snarkyjs";

export interface IMinaSigner {
  identifier: { t: number; k: string };
  signZkCred(
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): ZkCredProofed;
}

export class MinaSigner implements IMinaSigner {

  static inject = tokens("config");
  constructor(
    config: Config,
    private readonly privateKey: PrivateKey = PrivateKey.fromBase58(config.minaPrivateKey),
    private readonly publicKey: PublicKey = privateKey.toPublicKey()
  ) {}

  get identifier(): { t: number, k: string } {
    return {
      t: 1,
      k: this.publicKey.toBase58()
    };
  }

  signZkCred(
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): ZkCredProofed {
    const zkCred: ZkCredential = {
      isr: { id: this.identifier },
      ...props
    };
    const values = zkc.prepare<Field[]>(zkCred, transSchema);
    const hash = Poseidon.hash(values);
    const signature = Signature.create(this.privateKey, [hash]);
    return {
      ...zkc.sort(zkCred),
      proof: [
        {
          target: "Mina",
          key: this.publicKey.toBase58(),
          type: "Mina:Poseidon-BabyJubJub",
          transformSchema: transSchema,
          sign: signature.toBase58()
        }
      ]
    };
  }
}
