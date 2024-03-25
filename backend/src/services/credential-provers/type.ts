import { Attributes, type SignatureProof, type SignProofType, type StrictId } from "@zcredjs/core";
import { TrSchema } from "trgraph";

export interface ICredentialSignProver {
  proofType: SignProofType;
  issuerId: StrictId;
  issuerReference: string;
  signAttributes<
    TAttr extends Attributes = Attributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<SignatureProof>;
}
