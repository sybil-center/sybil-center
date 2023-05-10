import type { SignFn, SubjectProof } from "../types/index.js";

export interface SubjectProofProvider {
  /** Sign message function */
  sign: SignFn;
  /** Returns signer address */
  getAddress(): Promise<string>
  /** creates Subject proof to issue verifiable credential */
  proof(): Promise<SubjectProof>
}
