import { Identifier, IdType, IWalletAdapter, MinaChainId } from "@zcredjs/core";
import { Field, Scalar, Signature } from "o1js";

type SignMessageArgs = {
  message: string
}

interface SignedData {
  publicKey: string;
  data: string;
  signature: {
    field: string;
    scalar: string;
  };
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

export interface ProviderError extends Error {
  message: string; // error message.
  code: number; // error code.
  data?: unknown; // error body.
}

type SwitchChainArgs = {
  // Target chain ID. current support four types: mainnet, devnet, berkeley, testworld2.
  readonly chainId: string
}

type ChainInfoArgs = {
  // current chain ID, now will return mainnet, devnet, berkeley, testworld2.
  chainId: string,
  // current chain name. The default node name is fixed,
  // and the custom added ones are user-defined.
  name: string,
}

const PROVIDED_CHAIN_NAMES = ["mainnet", "berkeley"] as const;
type ChainName = typeof PROVIDED_CHAIN_NAMES[number];

function isChainIdName(name: string): name is ChainName {
  return PROVIDED_CHAIN_NAMES
    // @ts-expect-error
    .includes(name);
}

export interface IAuroWallet {
  requestAccounts(): Promise<string[]>;
  requestNetwork(): Promise<ChainInfoArgs>;
  switchChain(args: SwitchChainArgs): Promise<ChainInfoArgs>;
  getAccounts(): Promise<string[]>;
  signMessage(args: SignMessageArgs): Promise<SignedData>;
  verifyMessage(args: VerifyMessageArgs): Promise<boolean>;
  sendTransaction(args: SendTransactionArgs): Promise<{ hash: string }>;
}

export class AuraWalletAdapter implements IWalletAdapter {
  constructor(private readonly provider: IAuroWallet) {
    this.getAddress = this.getAddress.bind(this);
    this.getSubjectId = this.getSubjectId.bind(this);
    this.getChainId = this.getChainId.bind(this);
    this.sign = this.sign.bind(this);
  }

  async getAddress(): Promise<string> {
    const result = (await this.provider.requestAccounts());
    const address = result[0];
    if (address) return address;
    throw new Error(`Mina address is not found`);
  }

  async getSubjectId(): Promise<Identifier> {
    const idType: IdType = "mina:publickey";
    return {
      type: idType,
      key: await this.getAddress()
    };
  }

  async getChainId(): Promise<MinaChainId> {
    const { chainId: chainName } = await this.provider.requestNetwork();
    if (isChainIdName(chainName)) {
      return `mina:${chainName}`;
    }
    await this.switchToMain();
    return "mina:mainnet";
  }

  private async switchToMain(): Promise<ChainName> {
    await this.provider.switchChain({ chainId: "mainnet" });
    return "mainnet";
  }

  async sign(args: { message: string }) {
    const {
      signature: {
        field,
        scalar
      }
    } = await this.provider.signMessage(args);
    return Signature.fromObject({
      r: Field.fromJSON(field),
      s: Scalar.fromJSON(scalar)
    }).toBase58();
  };
}