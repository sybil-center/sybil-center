import { Signature } from "snarkyjs";
import Client from "mina-signer";
import { IVerifier, SignEntry } from "../../types/verifier.js";

type Options = {
  network: "mainnet" | "testnet"
}

export class MinaVerifier implements IVerifier<Options> {

  async verify({
      sign,
      msg,
      publickey
    }: SignEntry,
    opt?: Options): Promise<boolean> {
    const network = opt?.network ? opt.network : "mainnet";
    const minaClient = new Client({ network });
    const { r: field, s: scalar } = Signature.fromBase58(sign).toJSON();
    return minaClient.verifyMessage({
      signature: { field, scalar },
      publicKey: publickey,
      data: msg
    });
  }
}
