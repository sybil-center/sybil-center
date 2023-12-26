import { ACIProof, SignatureProof } from "../types/index.js";

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

function isACIProof(proof: unknown): proof is ACIProof {
  return typeof proof === "object" &&
    proof !== null &&
    "type" in proof &&
    typeof proof.type === "string" &&
    "aci" in proof &&
    typeof proof.aci === "string" &&
    "schema" in proof &&
    typeof proof.schema === "object" &&
    proof.schema !== null &&
    "attributes" in proof.schema &&
    typeof proof.schema.attributes === "object" &&
    proof.schema.attributes !== null &&
    "type" in proof.schema &&
    typeof proof.schema.type === "object" &&
    proof.schema.type !== null &&
    Array.isArray(proof.schema.type) &&
    "aci" in proof.schema &&
    typeof proof.schema.aci === "object" &&
    proof.schema.aci !== null &&
    Array.isArray(proof.schema.aci);
}

export const zcred = {
  isSignatureProof,
  isACIProof,
  chainIdReqexp: "^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$"
};

export * from "./repeat.js";