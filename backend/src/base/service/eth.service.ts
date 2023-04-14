import { ethers } from "ethers";
import { tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";

export interface IEthService {
  /**
   * Check existing of ethereum address
   * @param address
   */
  isAddressExist(address: string): Promise<boolean>;

  /**
   * Get ethereum address from signature (signed message) and message (unsigned message)
   * @param signMessage message fom sign but not signed
   * @param signature message after sign
   * @throws Error if signature can not be verified by the message
   */
  getAddress(signMessage: string, signature: string): string;

  /**
   * Get ethereum address from signature (signed message) and message (unsigned message),
   * also check existing of eth address
   * @param signMessage message fom sign but not signed
   * @param signature message after sign
   * @throws Error if signature can not be verified by the message
   */
  verifyAndGetAddress(signMessage: string, signature: string): Promise<string>;
}

/**
 * {@see IEthService}
 */
export class EthService implements IEthService {
  static inject = tokens("config");

  constructor(
    config: { ethNodeUrl: string },
    readonly provider = new ethers.providers.JsonRpcProvider(config.ethNodeUrl)
  ) {}

  async isAddressExist(address: string): Promise<boolean> {
    try {
      const balance = await this.provider.getBalance(address);
      return balance.gt(0);
    } catch (err) {
      return false;
    }
  }

  getAddress(signMessage: string, signature: string): string {
    try {
      return ethers.utils.verifyMessage(signMessage, signature);
    } catch (err) {
      throw new ClientError(`Can not verify signature: ${signature}`);
    }
  }

  async verifyAndGetAddress(
    signMessage: string,
    signature: string
  ): Promise<string> {
    const ethAddress = this.getAddress(signMessage, signature);
    const ethAddressExists = await this.isAddressExist(ethAddress); // TODO This is not right
    if (ethAddressExists) {
      return ethAddress;
    }
    throw new ClientError(`Ethereum address - ${ethAddress} not exists`);
  }
}
