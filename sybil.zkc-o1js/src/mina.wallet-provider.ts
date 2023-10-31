import { WalletProof, WalletProvider, ZkcId } from "@sybil-center/zkc-core";
import { Field, Scalar, Signature } from "o1js";

interface SignMessageArgs {
  message: string;
}

interface SignedData {
  publicKey: string,
  data: string,
  signature: {
    field: string,
    scalar: string
  }
}

interface VerifyMessageArgs {
  publicKey: string,
  payload: string,
  signature: {
    field: string,
    scalar: string
  }
}

type SendTransactionArgs = {
  transaction: any,
  feePayer?: {
    fee?: number,
    memo?: string
  };
}

export interface IAuroWallet {
  requestAccounts(): Promise<string[]>;
  requestNetwork(): Promise<"Mainnet" | "Devnet" | "Berkeley" | "Unknown">;
  getAccounts(): Promise<string[]>;
  signMessage(args: SignMessageArgs): Promise<SignedData>;
  verifyMessage(args: VerifyMessageArgs): Promise<boolean>;
  sendTransaction(args: SendTransactionArgs): Promise<{ hash: string }>;
}

export class MinaProvider implements WalletProvider {
  constructor(private readonly provider: IAuroWallet) {
    this.sign = this.sign.bind(this);
    this.getAddress = this.getAddress.bind(this);
    this.getProof = this.getProof.bind(this);
    this.getSubjectId = this.getSubjectId.bind(this);
  }

  async getAddress(): Promise<string> {
    const address = (await this.provider.requestAccounts())[0];
    if (address) return address;
    throw new Error(`Enable Mina wallet`);
  }

  async getSubjectId(): Promise<ZkcId> {
    return {
      t: 0,
      k: await this.getAddress()
    };
  }

  async sign(args: { message: string }): Promise<string> {
    const {
      signature: { field, scalar }
    } = await this.provider.signMessage(args);
    const sign = Signature.fromObject({
      r: Field.fromJSON(field),
      s: Scalar.fromJSON(scalar)
    });
    return sign.toBase58();
  };

  async getProof(): Promise<WalletProof> {
    return {
      subjectId: await this.getSubjectId(),
      signFn: this.sign
    };
  }

}
