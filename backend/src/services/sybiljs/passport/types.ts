import type { HttpCredential, StrictAttributes, StrictId } from "@zcredjs/core";
import { CredentialType } from "../types/index.js";

const GENDERS = ["male", "female", "other", "unknown"] as const;

export type Gender = typeof GENDERS[number]

export function isGender(gender: string) {
  return GENDERS.includes(gender as Gender);
}

export interface PassportAttributes extends StrictAttributes {
  type: CredentialType;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: StrictId;
    firstName: string;
    lastName: string;
    /** */
    birthDate: string;
    gender: Gender
  };
  /** 3 Alphabet ISO 3166 country code */
  countryCode: string;
  document: {
    id: string;
    /** Unique string refers to real passport. Each sybilId is unique ID of real passport*/
    sybilId: string;
  };
}

export type PassportCredential = HttpCredential<PassportAttributes>
