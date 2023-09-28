import { Signature } from "snarkyjs";
import Client from "mina-signer";
import { IVerifier, SignEntry } from "../../types/verifier.js";
import { ZkcChallengeReq } from "../../types/zkc.issuer.js";

type Options = Required<Required<ZkcChallengeReq>["options"]>

export class MinaVerifier implements IVerifier<Options> {

  async verify({
      sign,
      msg,
      publickey
    }: SignEntry,
    options?: Options): Promise<boolean> {
    const network = options?.mina?.network ? options?.mina.network : "mainnet";
    const minaClient = new Client({ network });
    const { r: field, s: scalar } = Signature.fromBase58(sign).toJSON();
    return minaClient.verifyMessage({
      signature: { field, scalar },
      publicKey: publickey,
      data: msg
    });
  }
}
