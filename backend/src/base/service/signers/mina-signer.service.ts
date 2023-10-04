import { Config } from "../../../backbone/config.js";
import { Proved, ZkcIdType, ZkCred } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "snarkyjs";
import { IZkcSigner } from "../../types/zkc.signer.js";
import { ZKC } from "../../../util/zk-credentials/index.js";


export class MinaSigner implements IZkcSigner {

  constructor(
    config: Config,
    private readonly privateKey: PrivateKey = PrivateKey.fromBase58(config.minaPrivateKey),
    private readonly publicKey: PublicKey = privateKey.toPublicKey()
  ) {}

  get identifier(): { t: ZkcIdType, k: string } {
    return {
      t: 0,
      k: this.publicKey.toBase58()
    };
  }
  async signZkCred<TCred extends ZkCred = ZkCred>(
    props: Omit<TCred, "isr">,
    transSchema: TransCredSchema
  ): Promise<Proved<TCred>> {
    //
    const zkCred: ZkCred = {
      isr: { id: this.identifier },
      ...props
    };
    let values = ZKC.preparator.prepare<Field[]>(zkCred, transSchema);
    const hash = Poseidon.hash(values);
    const signature = Signature.create(this.privateKey, [hash]);
    return {
      proof: [
        {
          key: this.publicKey.toBase58(),
          type: "Mina:PoseidonPasta",
          transformSchema: transSchema,
          sign: signature.toBase58()
        }
      ],
      ...ZKC.sortCred<TCred>(zkCred as TCred),
    };
  }
}
