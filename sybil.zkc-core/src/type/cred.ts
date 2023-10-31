import { Proof, ZkcID, ZkCred } from "zkc-core";
import { IdType } from "./identifiers.js";
import { Schema } from "./schemas.js";

export interface SybilID extends ZkcID {
  t: IdType;
}

export interface SybilProof extends Proof {
  issuer: {
    id: SybilID
  };
}

export interface SybilCred<TSbj = Record<string, unknown>> extends ZkCred<TSbj> {
  attributes: {
    sch: Schema;
    isd: number;
    exd: number;
    sbj: {
      id: SybilID;
    } & TSbj;
  }
}
