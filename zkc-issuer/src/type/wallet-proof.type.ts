import { ZkcId, ZkcIdTypeAlias } from "./credential.type.js";

export type SignFn = (args: { message: string }) => Promise<string>;


export type WalletProof = {
  subjectId: Omit<ZkcId, "t"> & { t: ZkcIdTypeAlias }
  signFn: SignFn
}
