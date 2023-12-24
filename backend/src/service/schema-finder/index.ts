import { O1GraphLink } from "o1js-trgraph";
import { findSignatureSchema } from "./signature-proof.js";
import { findACISchema } from "./aci-proof.js";

export type IdentifierSchema = {
  type: O1GraphLink[],
  key: O1GraphLink[]
}


export const SCHEMA = {
  getSignature: findSignatureSchema,
  getACI: findACISchema
};
