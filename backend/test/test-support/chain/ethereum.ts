import { ethers } from "ethers";

const ethDidPkhPrefix = "did:pkh:eip155:1";
const celoDidPkhPrefix = "did:pkh:eip155:42220";
const polygonDidPkhPrefix = "did:pkh:eip155:137";

const address = "0xCee05036e05350c2985582f158aEe0d9e0437446";
const privateKey =
  "5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9";

export const ethereumSupport = {
  info: {
    ethereum: {
      didPkhPrefix: ethDidPkhPrefix,
      didPkh: `${ethDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
    },
    celo: {
      didPkhPrefix: celoDidPkhPrefix,
      didPkh: `${celoDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
    },
    polygon: {
      didPkhPrefix: polygonDidPkhPrefix,
      didPkh: `${polygonDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
    },
  },

  async sign(message: string): Promise<string> {
    const hexSign = await new ethers.Wallet(privateKey).signMessage(message);
    return Buffer.from(hexSign.substring(2), "hex").toString("base64");
  },
};