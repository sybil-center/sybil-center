import type { IssuerTypes, IZkcIssuer, Proof, ZkcID, ZkCred } from "zkc-core";
import { ChallengeReq } from "zkc-core";
import { type IDType } from "./identifiers.js";
import { type Schema } from "./schemas.js";

export const PROOF_TYPES = ["Mina:PoseidonPasta", "Sha256Secp256k1"] as const;
export type ProofType = typeof PROOF_TYPES[number];

export function isProofType(type: string) {
  return PROOF_TYPES
    // @ts-ignore
    .includes(type);
}

export interface SybilID extends ZkcID {
  t: IDType;
}

export interface SybilProof extends Proof {
  type: ProofType;
  signature: {
    isr: { id: SybilID };
    sign: string
  };
}

export interface SybilCred<TSbj = Record<string, unknown>> extends ZkCred<TSbj> {
  proofs: SybilProof[];
  attributes: {
    sch: Schema;
    isd: number;
    exd: number;
    sbj: {
      id: SybilID;
    } & TSbj;
  };
}

export interface ISybilIssuer<T extends IssuerTypes = IssuerTypes> extends IZkcIssuer<T> {
  providedSchema: Schema;
}

export interface SybilChallengeReq extends ChallengeReq {
  subjectId: SybilID;
  options?: {
    expirationDate?: number;
    proofTypes?: ProofType[];
    mina?: {
      network?: "Mainnet" | "Devnet" | "Berkeley" | "Unknown"
    }
  };
}
