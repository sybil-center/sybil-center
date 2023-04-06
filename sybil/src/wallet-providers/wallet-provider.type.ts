import type { SignFn, SubjectProof } from "../types/index.js";

export interface IWalletProvider {
  sign: SignFn;
  getAddress(): Promise<string>
  proof(): Promise<SubjectProof>
}
