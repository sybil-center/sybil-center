import { ISignatureVerifier, SignEntry, SignOptions } from "./type.js";
import { ClientErr, Err } from "../../backbone/errors.js";
import Client from "mina-signer";
import { Signature } from "o1js";


const providedChainIds = ["mina:mainnet", "mina:berkeley"] as const;
type ChainId = typeof providedChainIds[number];

type NetworkName = "mainnet" | "testnet"

const CHAINID_NETWORK: Record<ChainId, NetworkName> = {
  "mina:mainnet": "mainnet",
  "mina:berkeley": "testnet"
};

function isChainId(chainId: string): chainId is ChainId {
  return providedChainIds
    // @ts-expect-error
    .includes(chainId);
}

function toChainId(chainId: string): ChainId {
  if (isChainId(chainId)) return chainId;
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
      return e;
    }

  }

  private getChainId(options?: SignOptions): ChainId {
    if (options?.chainId) return toChainId(options.chainId);
    throw new ClientErr(`Mina chain id is undefined`);
  }
}
