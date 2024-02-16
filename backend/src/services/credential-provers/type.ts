import { type SignProofType, type StrictAttributes, type StrictId, type SignatureProof } from "@zcredjs/core";
import { TrSchema } from "trgraph";

export interface ICredentialSignProver {
  proofType: SignProofType;
  issuerId: StrictId;
  issuerReference: string;
  signAttributes<
    TAttr extends StrictAttributes = StrictAttributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<SignatureProof>;
}
