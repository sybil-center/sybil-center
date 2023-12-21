export const ID_TYPES = ["mina:address", "ethereum:address"] as const;
export type IdType = typeof ID_TYPES[number];

export const SIGNATURE_PROOFS = ["mina:poseidon-pasta", "sha256-secp256k1"] as const;
export type SignProofType = typeof SIGNATURE_PROOFS[number];

export const CRED_TYPES = ["passport"] as const;
export type CredType = typeof CRED_TYPES[number]

export * from "./credential.js";