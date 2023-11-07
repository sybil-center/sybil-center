import { Selector } from "zkc-core";
import { ProofType, SybilID } from "./cred.js";

export interface SybilSelector extends Selector {
  proof: {
    id?: string;
    type?: ProofType;
    issuer?: { id: SybilID };
    index?: number;
  },
}
