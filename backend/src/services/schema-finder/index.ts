import { O1GraphLink } from "o1js-trgraph";
import { findSignatureSchema } from "./signature-proof.js";

export type IdentifierSchema = {
  type: O1GraphLink[],
  key: O1GraphLink[]
}


export const Schemas = {
  getSignature: findSignatureSchema
};
