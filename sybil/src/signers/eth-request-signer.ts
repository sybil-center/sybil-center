import { ISigner } from "./signer.type.js";
import type { SignResult } from "../types/index.js";
import * as uint8arrays from "uint8arrays";
import { SignAlgAlias } from "../types/index.js";

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface IEIP1193Provider {
  enable?: () => Promise<void>;
  request<T = unknown>(args: RequestArguments): Promise<T>;
}

export class EthRequestSigner implements ISigner {
  constructor(private readonly provider: IEIP1193Provider) {
    this.sign = this.sign.bind(this);
  }

  async sign(args: { message: string }): Promise<SignResult> {
    const message = args.message;
    const address = await this.getAccount();
    const hex = uint8arrays.toString(uint8arrays.fromString(message), "hex");
    const signature = await this.#signMessage(address, hex);
    const chainId = await this.getChainId();
    return {
      publicId: address,
      signature: signature,
      signAlg: `did:pkh:eip155:${chainId}` as SignAlgAlias
    };
  }

  async getAccount(): Promise<string> {
    const accounts = (await this.provider.request<string[]>({
      method: "eth_accounts",
    }));
    const account = accounts[0];
    if (!account) {
      throw new Error(`Enable Ethereum provider`);
    }
    return account;
  }

  async getChainId(): Promise<number> {
    return Number(
      await this.provider.request<string>({
        method: "net_version"
      })
    );
  }

  /**
   * Return signature as base64 string
   * @param address - ethereum 0x<address>
   * @param hexMessage - message as hex string
   */
  async #signMessage(address: string, hexMessage: string): Promise<string> {
    try {
      return this.#normalizeSignature(
        await this.provider.request<`0x${string}`>({
          method: "eth_sign",
          params: [address, hexMessage]
        })
      );
    } catch (err) {
      const reason = err as Error;
      if ("code" in reason && (reason.code === -32602 || reason.code === -32601)) {
        return this.#normalizeSignature(
          await this.provider.request<`0x${string}`>({
            method: "personal_sign",
            params: [address, hexMessage],
          })
        );
      }
      throw reason;
    }
  }

  #normalizeSignature(signature: string): string {
    const hexSign = signature.substring(2).toLowerCase();
    const bytesSign = uint8arrays.fromString(hexSign, "hex");
    return uint8arrays.toString(bytesSign, "base64");
  }
}
