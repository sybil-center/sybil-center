import { IVerifier, SignEntry } from "../../types/verifier.js";
import { utils } from "ethers";
import { IDName } from "@sybil-center/zkc-core";


export class EthVerifier implements IVerifier {

  get idType(): IDName { // Ethereum Address
    return "EthereumAddress";
  };

  async verify({
    sign, // hex as '0x<hex>' signature
    msg,
    publickey // eth address hex string
  }: SignEntry): Promise<boolean> {
    try {
      const actualAddress = utils.verifyMessage(msg, sign);
      return actualAddress.toLowerCase() === publickey.toLowerCase();
    } catch (e) {
      return false;
    }
  }

}
