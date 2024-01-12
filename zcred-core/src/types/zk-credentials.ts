export type Identifier = {
  type: string;
  key: string;
}

export type IdentifierSchema = {
  type: string[];
  key: string[];
}

export type TrSchemaValue<TLink extends string = string> = TLink[] | { [key: string]: TrSchemaValue<TLink> }

export type TrSchema<TLink extends string = string> = Record<string, TrSchemaValue<TLink>>

export type AttributesSchema = TrSchema

export type SignatureProof = {
  type: string;
  issuer: {
    id: Identifier;
  }
  signature: string;
  schema: {
    type: string[],
    issuer: {
      id: IdentifierSchema
    },
    signature: string[]
    attributes: AttributesSchema
  }
}

/** Attributes content identifier proof */
export type ACIProof = {
  type: string;
  aci: string;
  schema: {
    attributes: AttributesSchema;
    type: string[];
    aci: string[];
  }
}

export type Proof = SignatureProof | ACIProof

export type Attributes = {
  type: string;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: Identifier
  }
}

export type ZkCredential<TAttr extends Attributes = Attributes> = {
  attributes: TAttr,
  proofs: { [key: string]: Record<string, Proof> }
}

export const META_ISSUER_TYPES = ["http"] as const;
export type MetaIssuerType = typeof META_ISSUER_TYPES[number]

export interface HttpCredential<TAttr extends Attributes = Attributes> extends ZkCredential<TAttr> {
  meta: {
    issuer: {
      type: MetaIssuerType;
      uri: string;
    }
  };
  jws: string;
}