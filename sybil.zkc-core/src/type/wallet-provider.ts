import { WalletProof } from "zkc-core";
import { SybilID } from "./cred.js";

export interface SybilWalletProof extends WalletProof {
  subjectId: SybilID;
}
