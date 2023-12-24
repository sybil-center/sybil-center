import { ISignatureVerifier, SignEntry } from "./type.js";
import { utils } from "ethers";

export class EthereumSignatureVerifier implements ISignatureVerifier {
  async verify({
    signature,
    message,
    publickey
  }: SignEntry): Promise<boolean> {
    try {
      const actualAddress = utils.verifyMessage(message, signature);
      return actualAddress.toLowerCase() === (publickey.startsWith("0x")
          ? publickey.toLowerCase()
          : `0x${publickey.toLowerCase()}`
      );
    } catch (e) {
      return false
    }
  }

}
