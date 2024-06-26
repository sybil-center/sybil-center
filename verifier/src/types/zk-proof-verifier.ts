import { ProvingResult } from "./index.js";
import { JalProgram } from "@jaljs/core";

export interface IZkProofVerifier {
  jalProgram: JalProgram;
  verify(proofingResult: Omit<ProvingResult, "signature">): Promise<boolean>
}