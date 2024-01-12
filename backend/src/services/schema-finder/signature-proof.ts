import { CredType, IdType, SignProofType, TrSchema } from "@zcredjs/core";
import { O1GraphLink } from "o1js-trgraph";
import { IdentifierSchema } from "./index.js";
import { ServerErr } from "../../backbone/errors.js";


export const SIGNATURE_PROOF_SCHEMA_MAP: Record<CredType, Record<SignProofType, {
  subjectIdSchema: Record<IdType, IdentifierSchema>
  attributesSchema: TrSchema<O1GraphLink>
}>> = {
  passport: {
    "mina:poseidon-pasta": {
      subjectIdSchema: {
        "mina:publickey": {
          type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
          key: ["base58-mina:publickey", "mina:publickey-mina:fields"]
        },
        "ethereum:address": {
          type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
          key: ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
        }
      },
      attributesSchema: {
        type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
        issuanceDate: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
        validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
        validUntil: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
        subject: {
          firstName: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
          lastName: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
          birthDate: ["isodate-unixtime19", "unixtime19-uint64", "uint64-mina:field"],
          gender: ["ascii-bytes", "bytes-uint64", "uint64-mina:field"],
          countryCode: [
            "iso3166alpha3-iso3166numeric",
            "iso3166numeric-uint16",
            "uint16-mina:field"
          ],
          document: {
            id: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
          }
        }
      }
    }
  }
};

export type FindSignSchemaEntry = {
  proofType: SignProofType;
  idType: IdType;
  credentialType: CredType,
}

export function findSignatureSchema(findEntry: FindSignSchemaEntry) {
  const { proofType, credentialType, idType } = findEntry;
  const schemasEntry = SIGNATURE_PROOF_SCHEMA_MAP[credentialType]?.[proofType];
  if (schemasEntry) {
    const { subjectIdSchema, attributesSchema } = schemasEntry;
    const idSchema = subjectIdSchema[idType];
    if (idSchema) {
      (attributesSchema as any).subject.id = idSchema;
      return attributesSchema;
    }
  }
  throw new ServerErr({
    message: "Internal server error",
    place: findSignatureSchema.name,
    description: `Con not find signature proof schema by ${JSON.stringify(findEntry)}`
  });
}
