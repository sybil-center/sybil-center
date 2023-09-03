export type SignEntry = {
  sign: string;
  msg: string;
  publickey: string;
}

export interface IVerifier {
  /** Verify signature */
  verify(signEntry: SignEntry): Promise<boolean>
}
