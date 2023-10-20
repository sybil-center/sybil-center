export type SignEntry = {
  sign: string;
  msg: string;
  publickey: string;
}

export interface IVerifier<
  TOpt extends {} = {}
> {
  /** Verify signature */
  verify(signEntry: SignEntry, options?:TOpt): Promise<boolean>;
}
