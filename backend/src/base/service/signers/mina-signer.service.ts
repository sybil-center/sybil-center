import { Config } from "../../../backbone/config.js";
import { ZkCredential, ZkCredProved } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { zkc } from "../../../util/zk-credentials.util.js";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "snarkyjs";
import { IZkcSigner } from "../../types/zkc.signer.js";


export class MinaSigner implements IZkcSigner {

  constructor(
    config: Config,
    private readonly privateKey: PrivateKey = PrivateKey.fromBase58(config.minaPrivateKey),
    private readonly publicKey: PublicKey = privateKey.toPublicKey()
  ) {}

  get identifier(): { t: number, k: string } {
    return {
      t: 0,
      k: this.publicKey.toBase58()
    };
  }

  async signZkCred(
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): Promise<ZkCredProved> {
    const zkCred: ZkCredential = {
      isr: { id: this.identifier },
      ...props
    };
    let values = zkc.preparator.prepare<Field[]>(zkCred, transSchema);
    const hash = Poseidon.hash(values);
    const signature = Signature.create(this.privateKey, [hash]);
    return {
      ...zkc.sort(zkCred),
      proof: [
        {
          target: "mina",
          key: this.publicKey.toBase58(),
          type: "mina:Poseidon-BabyJubJub",
          transformSchema: transSchema,
          sign: signature.toBase58()
        }
      ]
    };
  }
}
