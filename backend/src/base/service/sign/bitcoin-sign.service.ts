import { SignService } from "../sign.service.js";
import { verify } from "bitcoinjs-message";

export async function verifyBitcoinSign(
  signature: Uint8Array,
  message: string,
  address: string
): Promise<boolean> {
  try {
    return verify(message, address, Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

export class BitcoinSignService extends SignService {
  readonly didPrefix = "did:pkh:bip122:000000000019d6689c085ae165831e93";
  protected readonly verifyFun = verifyBitcoinSign;
}
