import { Keypair } from "@solana/web3.js";
import * as ed25519 from "@noble/ed25519";
import * as u8a from "uint8arrays";


const didPkhPrefix = "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ";
const { publicKey, secretKey } = Keypair.generate();
const privateKey = secretKey.subarray(0, 32);
const address = u8a.toString(publicKey.toBytes(), "base58btc");

export const solanaTestUtil = {
  dids: {
    pkh: {
      prefix: didPkhPrefix,
      did: `${didPkhPrefix}:${address}`
    }
  },
  publicKey: u8a.toString(publicKey.toBytes(), "base58btc"),
  privateKey: u8a.toString(privateKey, "base58btc"),
  address: u8a.toString(publicKey.toBytes(), "base58btc"),
  signMessage: async (message: string): Promise<string> => {
    const signature = await ed25519.sign(new TextEncoder().encode(message), privateKey);
    return u8a.toString(signature, "base58btc");
  }
};
