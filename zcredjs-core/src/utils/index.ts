import { CRED_TYPES, CredType, ID_TYPES, IdType, SIGNATURE_PROOFS, SignProofType } from "../types/index.js";

function isIdType(id: string): id is IdType {
  return ID_TYPES
    // @ts-ignore
    .includes(id);
}

function isSignProofType(proofType: string): proofType is SignProofType {
  return SIGNATURE_PROOFS
    // @ts-ignore
    .includes(proofType);
}

function isCredType(credType: string): credType is CredType {
  return CRED_TYPES
    // @ts-ignore
    .includes(credType);
}

export const zcredUtil = {
  isIdType,
  isSignProofType,
  isCredType
};