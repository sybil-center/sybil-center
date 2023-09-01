import { Signature } from "snarkyjs";
import Client from "mina-signer";
import { IVerifier, SignEntry } from "../../types/verifier.js";


export class MinaVerifier implements IVerifier {

  constructor(
    private readonly minaClient = new Client({ network: "mainnet" }),
  ) {}

  async verify({
    sign,
    msg,
    publickey
  }: SignEntry): Promise<boolean> {
    const { r: field, s: scalar } = Signature.fromBase58(sign).toJSON();
    return this.minaClient.verifyMessage({
      signature: { field, scalar },
      publicKey: publickey,
      data: msg
    });
  }
}
