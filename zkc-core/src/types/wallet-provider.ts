import { ZkcID } from "./cred.js";

export type SignFn = (args: { message: string }) => Promise<string>;


export type WalletProof = {
  subjectId: ZkcID;
  signFn: SignFn;
}

export interface WalletProvider {

  getProof(): Promise<WalletProof>;

  getSubjectId(): Promise<ZkcID>;

  getAddress(): Promise<string>;

  sign: SignFn;
}


