import { ChallengeOptions } from "@zcredjs/core";

export type SignEntry = {
  signature: string;
  publickey: string;
  message: string;
}

export type SignOptions = Pick<ChallengeOptions, "chainId">

export interface ISignatureVerifier {
  verify(signEntry: SignEntry, options?: SignOptions): Promise<boolean>;
}
