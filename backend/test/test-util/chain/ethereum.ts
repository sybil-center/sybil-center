import { ethers } from "ethers";
import * as u8a from "uint8arrays";

const ethDidPkhPrefix = "did:pkh:eip155:1";
const celoDidPkhPrefix = "did:pkh:eip155:42220";
const polygonDidPkhPrefix = "did:pkh:eip155:137";

const address = "0xCee05036e05350c2985582f158aEe0d9e0437446";
const privateKey = "5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9";
const publicKey = "0x041d524d445e37b883f79f0c12a2bf80f60415771e61ef754eb4e0c88f913ce38cbb0efe5c08c21ee1befe162b1e59f15f7a97f93fa2f6ce63c0a37341b5eb4a06";


export const ethereumTestUtil = {
  dids: {
    pkh: {
      prefix: ethDidPkhPrefix,
      did: `${ethDidPkhPrefix}:${address}`
    }
  },
  privateKey: privateKey,
  publicKey: publicKey,
  address: address,
  signMessage: async (message: string) => {
    const hexSign = await new ethers.Wallet(privateKey).signMessage(message);
    return u8a.toString(u8a.fromString(hexSign.substring(2), "hex"), "base58btc");
  }
};

export const celoTestUtil = {
  ...ethereumTestUtil,
  dids: {
    pkh: {
      prefix: celoDidPkhPrefix,
      did: `${celoDidPkhPrefix}:${address}`
    }
  }
};

export const polygonTestUtil = {
  ...ethereumTestUtil,
  dids: {
    pkh: {
      prefix: polygonDidPkhPrefix,
      did: `${polygonDidPkhPrefix}:${address}`
    }
  }
};
