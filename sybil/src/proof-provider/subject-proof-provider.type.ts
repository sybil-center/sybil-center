import type { SignFn, SubjectProof } from "../types/index.js";

export interface SubjectProofProvider {
  sign: SignFn;
  getAddress(): Promise<string>
  proof(): Promise<SubjectProof>
}
