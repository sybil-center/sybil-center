import { Keypair } from "@solana/web3.js";
import * as ed25519 from "@noble/ed25519";
import * as u8a from "uint8arrays";
import { Prefix } from "@sybil-center/sdk"


const didPkhPrefix = "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ";
const { publicKey, secretKey } = Keypair.generate();
const privateKey = secretKey.subarray(0, 32);
const address = u8a.toString(publicKey.toBytes(), "base58btc");
const signType: Prefix = "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"

export const solanaSupport = {
  info: {
    didPkhPrefix: didPkhPrefix,
    privateKey: privateKey,
    publicKey: publicKey,
    signType: signType,
    address: address,
    didPkh: `${didPkhPrefix}:${address}`,
  },

  async sign(message: string): Promise<string> {
    return Buffer.from(
      await ed25519.sign(new TextEncoder().encode(message), privateKey)
    ).toString("base64");
  },
};
