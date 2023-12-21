import { Attributes, Identifier, ZkCredential } from "zcred-core";
import { CredType, IdType } from "./index.js";

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

export type PassportCred = ZkCredential<{
  type: CredType;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: ZIdentifier;
    firstName: string;
    lastName: string;
    birthDate: string;
    countryCode: string;
    document: {
      id: string;
    }
  }
}>

