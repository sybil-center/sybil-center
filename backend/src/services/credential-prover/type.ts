import {
  ACIProofType,
  type SignProofType,
  ZACIProof,
  type ZAttributes,
  type ZIdentifier,
  type ZSignatureProof
} from "@zcredjs/core";
import { TrSchema } from "trgraph";

export interface ICredentialSignProver {
  proofType: SignProofType;
  issuerId: ZIdentifier;
  issuerReference: string;
  signAttributes<
    TAttr extends ZAttributes = ZAttributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<ZSignatureProof>;
}

/** Attributes content identifier prover */
export interface IACIProver {
  proofType: ACIProofType,
  createProof<
    TAttr extends ZAttributes = ZAttributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<ZACIProof>
}
