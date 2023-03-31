import { SignAlgAlias } from "./chain-alias.type.js";

export type SignResult = {
  /**
   * As base64 string
   */
  signature: string;

  /**
   * Blockchain address in human-readable format or public key as base64
   */
  publicId: string;

  /**
   * Blockchain id according to
   * {@see https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md}
   * it also can be used with "did:pkh:" prefix
   */
  signAlg?: SignAlgAlias;
}
export type SignFn = (args: { message: string }) => Promise<SignResult>;
