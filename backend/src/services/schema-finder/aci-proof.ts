import { ACIProofType, CredType, TrSchema } from "@zcredjs/core";
import { O1GraphLink } from "o1js-trgraph";
import { ServerErr } from "../../backbone/errors.js";

export const ACI_PROOF_SCHEMA_MAP: Record<CredType, Record<ACIProofType, {
  attributesSchemas: TrSchema<O1GraphLink>
}>> = {
  passport: {
    "aci:mina-poseidon": {
      attributesSchemas: {
        type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
        validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
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
  },
  "passport-test": {
    "aci:mina-poseidon": {
      attributesSchemas: {
        type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
        validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
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

export type FindACISchemaEntry = {
  credentialType: CredType
  proofType: ACIProofType;
}

export function findACISchema(findEntry: FindACISchemaEntry): TrSchema {
  const { credentialType, proofType } = findEntry;
  const schema = ACI_PROOF_SCHEMA_MAP[credentialType]?.[proofType]?.attributesSchemas;
  if (schema) return schema;
  throw new ServerErr({
    message: "Internal server error",
    place: findACISchema.name,
    description: `Can not find trans schema for ACI proof by ${JSON.stringify(findEntry)}`
  });
}
