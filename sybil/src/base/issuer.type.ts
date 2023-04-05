import type { SubjectProof } from "../types/index.js";

export interface Issuer<TCredential, TOptions> {
  issueCredential(subjectProof: SubjectProof, options?: TOptions): Promise<TCredential>;
}
