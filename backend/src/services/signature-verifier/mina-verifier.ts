import { ISignatureVerifier, SignEntry, SignOptions } from "./type.js";
import { ClientErr, Err } from "../../backbone/errors.js";
import Client from "mina-signer";
import { Signature } from "o1js";
import { MinaChainId, zcredjs } from "@zcredjs/core";

const CLIENT_NETWORKS = ["mainnet", "testnet"] as const;
type Network = typeof CLIENT_NETWORKS[number]

const CHAINID_NETWORK: Record<MinaChainId, Network> = {
  "mina:mainnet": "mainnet",
  "mina:berkeley": "testnet"
};

function toChainId(chainId: string): MinaChainId {
  if (zcredjs.isMinaChainId(chainId)) return chainId;
  throw new ClientErr("Mina chain id is not correct");
}

function toNetworkName(chainId: string) {
  return CHAINID_NETWORK[toChainId(chainId)];
}

export class MinaSignatureVerifier implements ISignatureVerifier {

  async verify({
    signature,
    message,
    publickey
  }: SignEntry, options?: SignOptions): Promise<boolean> {
    try {
      const chainId = this.getChainId(options);
      const minaClient = new Client({ network: toNetworkName(chainId) });
      const { r: field, s: scalar } = Signature.fromBase58(signature).toJSON();
      return minaClient.verifyMessage({
        signature: { field, scalar },
        publicKey: publickey,
        data: message
      });
    } catch (e: any) {
      if (e instanceof Err) throw e;
      return false;
    }

  }

  private getChainId(options?: SignOptions): MinaChainId {
    if (options?.chainId) return toChainId(options.chainId);
    throw new ClientErr(`Mina chain id is undefined`);
  }
}
