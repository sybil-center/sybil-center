import {
  type AttributeSchema,
  type IDName,
  type ProofType,
  type SchemaName,
  type SignSchema,
  type SybilCred,
  SybilProof,
  toIdName,
  toSchemaName
} from "@sybil-center/zkc-core";

type PropsID = {
  t: string[];
  k: string[];
}

type Attributes = Omit<AttributeSchema, "sbj"> & {
  sbj: Record<string, unknown>;
}

export const SCHEMAS_MAP: Record<
  SchemaName,
  Record<
    ProofType,
    Record<keyof SybilProof["attributeSchemas"], {
      id: Record<IDName, PropsID>;
      attributes: Attributes;
      signature: SignSchema
    }>
  >
> = {
  passport: {
    "Mina:PoseidonPasta": {
      default: {
        id: {
          MinaPublicKey: { // Pasta public key (MINA)
            t: ["mina:uint16-field"],
            k: ["mina:base58-publickey", "mina:publickey-fields"]
          },
          EthereumAddress: {
            t: ["mina:uint16-field"],
            k: ["mina:hex-field"]
          },
          Secp256k1PublicKey: { // Secp256k1 public key TODO
            t: [],
            k: []
          }
        },
        attributes: {
          sch: ["mina:uint64-field"],
          isd: ["mina:uint64-field"],
          exd: ["mina:uint64-field"],
          sbj: {
            fn: [
              "utf8-bytes",
              "bytes-uint",
              "mina:uint-field.order",
              "mina:uint-field"
            ],
            ln: [
              "utf8-bytes",
              "bytes-uint",
              "mina:uint-field.order",
              "mina:uint-field"
            ],
            bd: ["mina:uint64-field"],
            cc: ["mina:uint32-field"],
            doc: {
              t: ["mina:uint32-field"],
              id: [
                "utf8-bytes",
                "bytes-uint",
                "mina:uint-field.order",
                "mina:uint-field"
              ],
            }
          }
        },
        signature: {
          isr: {
            id: {
              t: ["mina:uint16-field"],
              k: [
                "mina:base58-publickey",
                "mina:publickey-fields"
              ]
            }
          },
          sign: ["mina:base58-signature", "mina:signature-fields"]
        }
      },
      pre: {
        id: {
          MinaPublicKey: { // Pasta public key (MINA)
            t: ["mina:uint16-field"],
            k: ["mina:base58-publickey"]
          },
          EthereumAddress: {
            t: ["mina:uint16-field"],
            k: ["mina:hex-field"]
          },
          Secp256k1PublicKey: { // Secp256k1 public key TODO
            t: [],
            k: []
          }
        },
        attributes: {
          sch: ["mina:uint64-field"],
          isd: ["mina:uint64-field"],
          exd: ["mina:uint64-field"],
          sbj: {
            fn: [
              "utf8-bytes",
              "bytes-uint",
              "mina:uint-field.order",
              "mina:uint-field"
            ],
            ln: [
              "utf8-bytes",
              "bytes-uint",
              "mina:uint-field.order",
              "mina:uint-field"
            ],
            bd: ["mina:uint64-field"],
            cc: ["mina:uint32-field"],
            doc: {
              t: ["mina:uint32-field"],
              id: [
                "utf8-bytes",
                "bytes-uint",
                "mina:uint-field.order",
                "mina:uint-field"
              ],
            }
          }
        },
        signature: {
          isr: {
            id: {
              t: ["mina:uint16-field"],
              k: ["mina:base58-publickey"]
            }
          },
          sign: ["mina:base58-signature"]
        }
      }
    },


    "Sha256Secp256k1": {
      default: {
        id: {
          MinaPublicKey: {
            t: ["uint16-bytes"],
            k: ["base58-bytes"],
          },
          EthereumAddress: {
            t: ["uint16-bytes"],
            k: ["hex-bytes"]
          },
          Secp256k1PublicKey: { // TODO
            t: [],
            k: []
          }
        },
        signature: {
          isr: {
            id: {
              t: ["uint16-bytes"],
              k: ["hex-bytes"], // 64 bytes secp256k1 public key
            }
          },
          sign: ["hex-bytes"], // secp256k1 signature
        },
        attributes: {
          sch: ["uint64-bytes"],
          isd: ["uint64-bytes"],
          exd: ["uint64-bytes"],
          sbj: {
            bd: ["uint64-bytes"],
            cc: ["uint16-bytes"],
            fn: [
              "utf8-bytes",
              "bytes-uint",
              "mod.uint128",
              "uint128-bytes"
            ],
            ln: [
              "utf8-bytes",
              "bytes-uint",
              "mod.uint128",
              "uint128-bytes"
            ],
            doc: {
              t: ["uint16-bytes"],
              id: [
                "utf8-bytes",
                "bytes-uint",
                "mod.uint256",
                "uint256-bytes"
              ]
            }
          }
        }
      }
    }
  }
};

export function getTransformSchemas(args: {
  attributes: SybilCred["attributes"];
  proofType: ProofType;
}): {
  attributeSchemas: SybilProof["attributeSchemas"];
  signatureSchemas: SybilProof["signatureSchemas"];
} {
  const {
    attributes,
    proofType
  } = args;
  const schemaName = toSchemaName(attributes.sch);
  const idName = toIdName(attributes.sbj.id.t);
  const schemas = SCHEMAS_MAP[schemaName][proofType];
  const attributeSchemas: Record<string, AttributeSchema> = {};
  const signatureSchemas: Record<string, SignSchema> = {};
  for (const schemaType in schemas) {
    const schema = schemas[schemaType]!;
    const idSchema = schema.id[idName];
    attributeSchemas[schemaType] = {
      ...schema.attributes,
      sbj: {
        id: idSchema,
        ...schema.attributes.sbj
      }
    };
    signatureSchemas[schemaType] = schema.signature;
  }
  return {
    attributeSchemas: attributeSchemas as SybilProof["attributeSchemas"],
    signatureSchemas: signatureSchemas as SybilProof["signatureSchemas"]
  };
}