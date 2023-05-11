import { useAccount, useNetwork, useSignMessage } from "wagmi";
import * as u8a from "uint8arrays";

export function useSubjectProof() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chain } = useNetwork();

  const signMessage = async (args: { message: string }): Promise<string> => {
    const message = args.message;
    const sign = await signMessageAsync({ message: message });
    return u8a.toString(u8a.fromString(sign.substring(2), "hex"), "base64");

  };

  return { subjectId: `eip155:${chain?.id}:${address}`, signFn: signMessage };
}
