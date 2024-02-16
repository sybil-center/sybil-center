import { ClientErr } from "../../../backbone/errors.js";
import { ethers } from "ethers";

export type VerifySignFun = (
  signature: Uint8Array,
  message: string,
  address: string
) => Promise<boolean>;

type VerifyArgs = {
  address: string,
  message: string,
  signature: string
}

/**
 * Responsible for interaction with blockchain
 */
export abstract class SignatureService {
  abstract readonly didPrefix: string;
  protected abstract readonly verifyFun: VerifySignFun;

  /**
   * Verify signature. If signature verified return
   * address as string according sign documentation,
   * else throw {@link ClientErr}
   * @param signature base64 string
   * @param message
   * @param publicId - has to be blockchain address or public key as base64
   * @return address if signature verified
   * @throws ClientErr if signature is not verified
   */
  async verify({
    address,
    signature,
    message,
  }: VerifyArgs): Promise<string> {
    const sign = new Uint8Array(Buffer.from(signature, "base64"));
    const verified = await this.verifyFun(sign, message, address);
    if (verified) return address;
    throw new ClientErr(`Can not verify signature`);
  }

  /**
   * Verify signature and return did:pkh.
   * If verified return did:pkh representation of address,
   * else throw {@link ClientErr}
   * @param verifyArgs object which contains signature, message, address
   */
  async did(verifyArgs: VerifyArgs): Promise<string> {
    const adr = await this.verify(verifyArgs);
    return `${this.didPrefix}:${adr}`;
  }
}

export async function verifyEthSign(
  signature: Uint8Array,
  message: string,
  address: string
): Promise<boolean> {
  try {
    const sign = `0x${Buffer.from(signature).toString("hex")}`;
    const actualAddress = ethers.utils.verifyMessage(message, sign);
    return actualAddress.toLowerCase() === address.toLowerCase();
  } catch (e) {
    return false;
  }
}

/**
 * Responsible for interaction with the Ethereum like blockchain
 * (including Ethereum)
 */
export abstract class EthLikeSignService extends SignatureService {
  protected verifyFun = verifyEthSign;
}
