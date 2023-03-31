import type { SignFn } from "../types/index.js";

export interface IClient<TCredential, TOptions> {
  issueCredential(signFn: SignFn, options?: TOptions): Promise<TCredential>;
}
