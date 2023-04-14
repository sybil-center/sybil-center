import { IWalletProvider } from "./wallet-provider.type.js";
import { SignResult, SubjectProof } from "../base/types/index.js";

type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signAndSendTransaction"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "connect" | "disconnect" | "accountChanged";

export type Status = "success" | "warning" | "error" | "info";

type PublicKey = {
  [key: string]: any
  toString(): string;
}

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

export interface PhantomProvider {
  publicKey: PublicKey | null;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  isConnected: boolean | null;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<any>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

export class PhantomWalletProvider implements IWalletProvider {
  constructor(private readonly provider: PhantomProvider) {}

  async sign(args: { message: string }): Promise<SignResult> {
    const encodedMessage = new TextEncoder().encode(args.message);
    const signature = await this.provider.signMessage(encodedMessage, "utf8");
    return {
      signature: signature,
      signType: "solana"
    };
  }

  async getAddress(): Promise<string> {
    if (this.provider.publicKey) {
      return this.provider.publicKey.toString();
    }
    const resp = await this.provider.connect();
    return resp.publicKey.toString();
  }

  async proof(): Promise<SubjectProof> {
    const publicId = await this.getAddress();
    return {
      publicId: publicId,
      signFn: this.sign
    }
  }

}
