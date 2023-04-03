import type { SignFn } from "../types/index.js";

export interface Issuer<TCredential, TOptions> {
  issueCredential(signFn: SignFn, options?: TOptions): Promise<TCredential>;
}
