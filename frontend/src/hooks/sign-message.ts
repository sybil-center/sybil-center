import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { SignResult, ChainAlias } from "@sybil-center/sdk";
import * as uint8array from "uint8arrays";

export function useSign() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chain } = useNetwork();

  const signMessage = async (args: { message: string }): Promise<SignResult> => {
    const message = args.message
    const sign = await signMessageAsync({message: message});
    const signature = uint8array.toString(
      uint8array.fromString(sign.substring(2), 'hex'),
      "base64"
    );
    return {
      signature: signature,
      address: address!,
      chain: `did:pkh:eip155:${chain?.id!}` as ChainAlias
    }
  }

  return { signMessage }
}
