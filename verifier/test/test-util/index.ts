import { ethers, Wallet } from "ethers";

export const TEST_ROOT_DIR = new URL("../", import.meta.url);
export const PATH_TO_CONFIG = new URL("../config/valid.env", import.meta.url);

const ethPrivateKey = "5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9";
const ethWallet = new ethers.Wallet(ethPrivateKey);

export const testUtil = {
  ethereum: {
    address: ethWallet.address,
    privateKey: ethPrivateKey,
    publicKey: ethWallet.getAddress(),
    signMessage: (message: Parameters<Wallet["signMessage"]>[0]) => ethWallet.signMessage(message),
    wallet: ethWallet,
    stringZcredId: `ethereum:address:${ethWallet.address.toLowerCase()}`,
    zcredId: {
      type: "ethereum:address",
      key: ethWallet.address.toLowerCase()
    }
  }
};