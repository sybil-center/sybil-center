import { Credential as OrgCredential } from "@sybil-center/sdk/types";
import * as t from "io-ts";

export const Credential = new t.Type<OrgCredential, OrgCredential, any> (
  "RawCredential-as-Credential",
  (credential: any): credential is OrgCredential => {
    return credential !== null &&
      typeof credential === "object" &&
      credential.expirationDate !== null &&
      typeof credential.expirationDate === "object" &&
      credential.issuanceDate !== null &&
      typeof credential.issuanceDate === "object"
  },
  (input, context) => {
    try {
      input.issuanceDate = new Date(input.issuanceDate);
      const expirationDate = input.expirationDate
      input.expirationDate = expirationDate
        ? new Date(expirationDate)
        : undefined
      const createdProof = input.proof?.created;
      input.proof.created = createdProof
        ? new Date(createdProof)
        : undefined
      return t.success(input as OrgCredential)
    } catch (e: any) {
      return t.failure(input, context, String(e))
    }
  },
  (credential) => credential
)

export type Credential = t.TypeOf<typeof Credential>
