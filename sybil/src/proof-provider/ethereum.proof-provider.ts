import { SubjectProofProvider } from "./subject-proof-provider.type.js";
import type { SubjectProof } from "../types/index.js";
import * as u8a from "uint8arrays";

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface IEIP1193Provider {
  enable?: () => Promise<void>;
  request<T = unknown>(args: RequestArguments): Promise<T>;
}

export class EthProofProvider implements SubjectProofProvider {
  constructor(private readonly provider: IEIP1193Provider) {
    this.sign = this.sign.bind(this);
    this.getAddress = this.getAddress.bind(this);
  }
  async proof(): Promise<SubjectProof> {
    const chainId = await this.getChainId();
    const address = await this.getAddress();
    return {
      subjectId: `did:pkh:eip155:${chainId}:${address}`,
      signFn: this.sign
    }
  }

  async sign(args: { message: string }): Promise<string> {
    const message = args.message;
    const address = await this.getAddress();
    const hex = u8a.toString(u8a.fromString(message), "hex");
    return await this.#signMessage(address, hex)
  }

  async getAddress(): Promise<string> {
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
    const bytesSign = u8a.fromString(hexSign, "hex");
    return u8a.toString(bytesSign, "base64");
  }
}
