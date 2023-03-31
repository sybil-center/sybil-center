import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import * as ed25519 from "@noble/ed25519";

const didPkhPrefix = "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ";
const { publicKey, secretKey } = Keypair.generate();
const privateKey = secretKey.subarray(0, 32);
const address = base58.encode(publicKey.toBytes());

export const solanaSupport = {
  info: {
    didPkhPrefix: didPkhPrefix,
    privateKey: privateKey,
    publicKey: publicKey,
    address: address,
    didPkh: `${didPkhPrefix}:${address}`,
  },

  async sign(message: string): Promise<string> {
    return Buffer.from(
      await ed25519.sign(new TextEncoder().encode(message), privateKey)
    ).toString("base64");
  },
};
