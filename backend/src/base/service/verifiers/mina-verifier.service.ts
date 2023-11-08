import { Signature } from "snarkyjs";
import Client from "mina-signer";
import { IVerifier, SignEntry } from "../../types/verifier.js";
import { IDName, SybilChallengeReq } from "@sybil-center/zkc-core";
import { ClientErr } from "../../../backbone/errors.js";

type Options = Required<Pick<Required<SybilChallengeReq>["options"], "mina">>;

type AuroNetwork = Extract<Required<Options["mina"]>["network"], "Mainnet" | "Berkeley">;
type SignerNetwork = "testnet" | "mainnet";

const NETWORK_MAP: Record<AuroNetwork, SignerNetwork> = {
  Mainnet: "mainnet",
  Berkeley: "testnet"
};


export class MinaVerifier implements IVerifier<Options> {

  get idType(): IDName { // Mina Public Key
    return "MinaPublicKey";
  };

  async verify({
      sign,
      msg,
      publickey
    }: SignEntry,
    options?: Options): Promise<boolean> {
    const auroNetwork = options?.mina?.network
      ? options?.mina.network
      : "Mainnet";
    const minaClient = new Client({ network: this.toSignerNetwork(auroNetwork) });
    const { r: field, s: scalar } = Signature.fromBase58(sign).toJSON();
    return minaClient.verifyMessage({
      signature: { field, scalar },
      publicKey: publickey,
      data: msg
    });
  }

  toSignerNetwork(network: string): SignerNetwork {
    const isNetwork = function isAuroNetwork(_network: string): _network is AuroNetwork {
      return Object.keys(NETWORK_MAP)
        .includes(network);
    }(network);
    if (!isNetwork) throw new ClientErr(`Unsupported Mina network type`);
    return NETWORK_MAP[network];
  }
}
