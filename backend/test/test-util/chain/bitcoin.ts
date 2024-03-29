import bitcoin from "bitcoinjs-message";
import * as u8a from "uint8arrays";

const didPkhPrefix = "did:pkh:bip122:000000000019d6689c085ae165831e93";
const privateKey =
  "e2fd1f1c2cdf749cb3ad7d21198aabfa83ec3e05c6d0b00912ec38d75137f48e";
const publicKey =
  "049c98b3c98030a12954b7e2bd6079f2a0f4142139a4d324f85d9144e87f73f170a6f78c36f231336543d4f79e21367028d944e75f150198b7a24729b7912e7649";
const address = "1NMNYSLhjdAufei5iiVFVPvt1tJt44hVw2";


export const bitcoinTestUtil = {
  dids: {
    pkh: {
      prefix: didPkhPrefix,
      did: `${didPkhPrefix}:${address}`
    }
  },
  privateKey: privateKey,
  publicKey: publicKey,
  address: address,
  signMessage: async (message: string): Promise<string> => {
    const signature = bitcoin.sign(message, Buffer.from(privateKey, "hex"));
    return u8a.toString(new Uint8Array(signature), "base58btc");

  }
};
