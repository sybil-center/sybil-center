export type Identifier = {
    type: string;
    key: string;
};
export type IdentifierSchema = {
    type: string[];
    key: string[];
};
export type AttributesSchema = string[] | {
    [key: string]: AttributesSchema;
};
export type SignatureProof = {
    type: string;
    issuer: {
        id: Identifier;
    };
    signature: string;
    schema: {
        type: string[];
        issuer: {
            id: IdentifierSchema;
        };
        signature: string[];
        attributes: AttributesSchema;
    };
};
export type Proof = SignatureProof;
export type Attributes = {
    type: string;
    issuanceDate: string;
    validFrom: string;
    validUntil: string;
    subject: {
        id: Identifier;
    };
};
export type ZkCredential<TAttr extends Attributes = Attributes> = {
    attributes: TAttr;
    proofs: {
        [key: string]: Record<string, Proof>;
    };
};
