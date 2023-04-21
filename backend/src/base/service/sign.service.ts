import { ClientError } from "../../backbone/errors.js";
import { ethers } from "ethers";

export type VerifySignFun = (
  signature: Uint8Array,
  message: string,
  address: string
) => Promise<boolean>;

/**
 * Responsible for interaction with blockchain
 */
export abstract class SignService {
  abstract readonly didPrefix: string;
  protected abstract readonly verifyFun: VerifySignFun;

  /**
   * Verify signature. If signature verified return
   * address as string according sign documentation,
   * else throw {@link ClientError}
   * @param signature base64 string
   * @param message
   * @param publicId - has to be blockchain address or public key as base64
   * @return address if signature verified
   * @throws ClientError if signature is not verified
   */
  async verify(
    signature: string,
    message: string,
    publicId: string
  ): Promise<string> {
    const sign = new Uint8Array(Buffer.from(signature, "base64"));
    const verified = await this.verifyFun(sign, message, publicId);
    if (verified) return publicId;
    throw new ClientError(`Can not verify signature`);
  }

  /**
   * Verify signature and return did:pkh.
   * If verified return did:pkh representation of address,
   * else throw {@link ClientError}
   * @param signature - base64 string
   * @param message as utf-8 string
   * @param publicId - have to be blockchain address or public key as base64
   */
  async did(
    signature: string,
    message: string,
    publicId: string
  ): Promise<string> {
    const adr = await this.verify(signature, message, publicId);
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
export abstract class EthLikeSignService extends SignService {
  protected verifyFun = verifyEthSign;
}
