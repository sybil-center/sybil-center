import { ethers } from "ethers";
import { Prefix } from "@sybil-center/sdk";

const ethChainId = "eip155:1";
const celoChainId = "eip155:42220";
const polygonChainId = "eip155:137";

const ethDidPkhPrefix = `did:pkh:${ethChainId}`;
const celoDidPkhPrefix = `did:pkh:${celoChainId}`;
const polygonDidPkhPrefix = `did:pkh:${polygonChainId}`;

const address = "0xCee05036e05350c2985582f158aEe0d9e0437446";
const privateKey =
  "5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9";

const ethSignType: Prefix = "eip155:1";
const celoSignType: Prefix = "eip155:42220";
const polygonSignType: Prefix = "eip155:137";

export const ethereumSupport = {
  info: {
    ethereum: {
      didPkhPrefix: ethDidPkhPrefix,
      signType: ethSignType,
      didPkh: `${ethDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
      accountId: `${ethChainId}:${address}`
    },
    celo: {
      didPkhPrefix: celoDidPkhPrefix,
      signType: celoSignType,
      didPkh: `${celoDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
      accountId: `${celoChainId}:${address}`
    },
    polygon: {
      didPkhPrefix: polygonDidPkhPrefix,
      signType: polygonSignType,
      didPkh: `${polygonDidPkhPrefix}:${address}`,
      address: address,
      privateKey: privateKey,
      accountId: `${polygonChainId}:${address}`
    },
  },

  async sign(message: string): Promise<string> {
    const hexSign = await new ethers.Wallet(privateKey).signMessage(message);
    return Buffer.from(hexSign.substring(2), "hex").toString("base64");
  },
};
