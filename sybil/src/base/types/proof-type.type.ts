export type ProofType =
  | "RSA"
  | "AES"
  | "Ed25519"
  | "JsonWebSignature2020"

export const RSA: ProofType = "RSA" as const;
export const AES: ProofType = "AES" as const;
export const Ed25519: ProofType = "Ed25519" as const;
export const JsonWebSignature2020: ProofType = "JsonWebSignature2020" as const;
