import type { IssuerTypes, IZkcIssuer, Proof, ZkcID, ZkCred } from "zkc-core";
import { type IdType } from "./identifiers.js";
import { type Schema } from "./schemas.js";

export interface SybilID extends ZkcID {
  t: IdType;
}

export interface SybilProof extends Proof {
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

export interface ISybilIssuer<T extends IssuerTypes> extends IZkcIssuer<T> {
  providedSchema: Schema;
}
