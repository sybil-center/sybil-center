import { useAccount, useNetwork, useSignMessage } from "wagmi";
import * as uint8array from "uint8arrays";

export function useSubjectProof() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chain } = useNetwork();

  const signMessage = async (args: { message: string }): Promise<string> => {
    const message = args.message;
    const sign = await signMessageAsync({ message: message });
    return uint8array.toString(uint8array.fromString(sign.substring(2), "hex"), "base64");

  };

  return { subjectId: `eip155:${chain?.id}:${address}` as string ,signMessage };
}
