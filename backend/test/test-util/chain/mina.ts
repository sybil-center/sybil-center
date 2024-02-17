import Client from "mina-signer";
import { MinaChainId } from "@zcredjs/core";
import { Field, Scalar, Signature } from "o1js";

const privateKey = "EKE8VhKY6wGgeWS7fpPhzQDsf9yjkiHfnzM3AEeCH5wc2pxqGsHF";
const publicKey = "B62qqXhJ8qgXdApGoAvZHeXrHEg6YGqmThFcRN8xKqAvJsqjmUMVaZE";

const CLIENT_NETWORKS = ["mainnet", "testnet"] as const;
type Network = typeof CLIENT_NETWORKS[number]

const CHAINID_NETWORK: Record<MinaChainId, Network> = {
  "mina:mainnet": "mainnet",
  "mina:berkeley": "testnet"
};

export const minaTestUtil = {
  privateKey: privateKey,
  publicKey: publicKey,
  address: publicKey,
  signMessage: async (message: string, chainId: MinaChainId): Promise<string> => {
    const network = CHAINID_NETWORK[chainId];
    const client = new Client({ network: network });
    const { signature: { field, scalar } } = client.signMessage(message, privateKey);
    return Signature.fromObject({
      r: Field.fromJSON(field),
      s: Scalar.fromJSON(scalar)
    }).toBase58();
  }
};
