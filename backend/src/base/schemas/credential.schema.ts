export const credentialSchema = {
  type: "object",
  nullable: false,
  required: [
    "@context",
    "type",
    "issuer",
    "credentialSubject",
    "issuanceDate",
    "proof"
  ],
  properties: {
    "@context": {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string",
      }
    },
    type: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: {
        type: "string"
      }
    },
    issuer: {
      anyOf: [
        { type: "string" },
        {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        }
      ]
    },
    credentialSubject: {
      type: "object",
      properties: {
        id: { type: "string" }
      }
    },
    issuanceDate: {
      type: "string",
      format: "date-time"
    },
    proof: {
      type: "object",
      required: ["type", "verificationMethod"],
      properties: {
        type: { type: "string" },
        verificationMethod: { type: "string"},
        jws: { type: "string"}
      }
    },
    expirationDate: {
      type: "string",
      format: "date-time"
    },
    id: { type: "string" },
  }
};
