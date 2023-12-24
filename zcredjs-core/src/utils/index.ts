import { CRED_TYPES, CredType, ID_TYPES, IdType, SIGNATURE_PROOFS, SignProofType } from "../types/index.js";
import { ACIProof, SignatureProof } from "zcred-core";

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

function isSignatureProof(proof: any): proof is SignatureProof {
  return typeof proof?.issuer?.id?.key === "string" &&
    typeof proof?.issuer?.id?.type === "string" &&
    typeof proof?.signature === "string" &&
    typeof proof?.type === "string" &&
    typeof proof?.schema === "object" &&
    typeof proof?.schema?.attributes === "object" &&
    Array.isArray(proof?.schema?.signature) &&
    Array.isArray(proof?.schema?.issuer?.id?.key) &&
    Array.isArray(proof?.schema?.issuer?.id?.type) &&
    Array.isArray(proof?.schema?.type);
}

function isACIProof(proof: any): proof is ACIProof {
  return typeof proof?.type === "string" &&
    typeof proof?.aci === "string" &&
    typeof proof?.schema === "object" &&
    typeof proof?.schema?.attributes === "object" &&
    Array.isArray(proof?.schema?.type) &&
    Array.isArray(proof?.schema?.aci);
}

export const zcredUtil = {
  isIdType,
  isSignProofType,
  isCredType,
  isSignatureProof,
  isACIProof
};