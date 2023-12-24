import { type ACIProof, type Attributes, type Identifier, type SignatureProof, type ZkCredential } from "zcred-core";
import { ACIProofType, CredType, IdType, SignProofType } from "./index.js";

export interface ZIdentifier extends Identifier {
  type: IdType;
  key: string;
}

export interface ZAttributes extends Attributes {
  type: CredType;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: Identifier;
  };
}

export interface ZSignatureProof extends SignatureProof {
  type: SignProofType;
  issuer: {
    id: ZIdentifier;
  };
}

export interface ZACIProof extends ACIProof {
  type: ACIProofType;
}

export type Gender = "male" | "female" | "other"

export type PassportAttributes = {
  type: CredType;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: ZIdentifier;
    firstName: string;
    lastName: string;
    birthDate: string;
    gender: Gender;
    countryCode: string;
    document: {
      id: string;
    }
  }
}

export type PassportCred = ZkCredential<PassportAttributes>

