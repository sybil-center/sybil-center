export type SignEntry = {
  sign: string;
  msg: string;
  publickey: string;
}

export interface IVerifier {
  verify(signEntry: SignEntry): Promise<boolean>
}
