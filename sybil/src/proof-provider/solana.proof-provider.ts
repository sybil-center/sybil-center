import { SubjectProofProvider } from "./subject-proof-provider.type.js";
import { SignResult, SubjectProof } from "../base/types/index.js";
import * as u8a from "uint8arrays";

type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "connect" | "disconnect" | "accountChanged";

export type Status = "success" | "warning" | "error" | "info";

type PublicKey = {
  [key: string]: any
  toString(): string;
}

type ConnectOpts = {
  onlyIfTrusted: boolean;
}

type RequestTypes = {
  "connect": {
    params: undefined,
    result: { publicKey: PublicKey }
  },
  "signMessage": {
    params: {
      message: Uint8Array | string,
      display?: DisplayEncoding
    }
    result: Omit<PhantomSignResult, "signature"> & {
      signature: string
    }
  },

}

/** Establish on Phantom provider */
export interface SolanaProvider {
  publicKey: PublicKey | null;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  isConnected: boolean | null;
  signMessage: (message: Uint8Array | string, display?: DisplayEncoding) => Promise<PhantomSignResult>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: <Method extends keyof RequestTypes>(args: {
      method: Method,
      params?: RequestTypes[Method]["params"]
    }
  ) => Promise<RequestTypes[Method]["result"]>;
  isPhantom: boolean;
}

type PhantomSignResult = {
  signature: Uint8Array
  publicKey: string
}

export class SolanaProofProvider implements SubjectProofProvider {

  constructor(private readonly provider: SolanaProvider) {
    this.sign = this.sign.bind(this);
    this.getAddress = this.getAddress.bind(this);
  }

  async sign(args: { message: string }): Promise<SignResult> {
    const encodedMessage = new TextEncoder().encode(args.message);
    const { signature } = await this.provider.request({
      method: "signMessage",
      params: {
        message: encodedMessage,
        display: "utf8"
      }
    });
    return {
      signature: u8a.toString(u8a.fromString(signature, "base58btc"), "base64"),
      signType: "solana"
    };
  }

  async getAddress(): Promise<string> {
    if (this.provider.publicKey) {
      return this.provider.publicKey.toString();
    }
    const resp = await this.provider.request({ method: "connect" });
    return resp.publicKey.toString();
  }

  async proof(): Promise<SubjectProof> {
    const publicId = await this.getAddress();
    return {
      publicId: publicId,
      signFn: this.sign
    };
  }
}
