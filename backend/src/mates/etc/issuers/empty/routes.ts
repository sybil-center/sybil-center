import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ProofType } from "@sybil-center/sdk";
import { issueEP } from "../../../../util/vc-route-util.js";

const tags = ["Empty verifiable credential"];
export const emptyRoutes: VCRoutes = {
  vcType: VCType.Empty,

  issue: {
    method: ["POST"],
    url: issueEP(VCType.Empty),
    schema: {
      tags: tags,

      body: {
        type: "object",
        properties: {
          vcId: {
            type: ["string"],
            description: `optional: id of verifiable credential.
                          If undefined id of vc will not present in response`,
            format: "uri",
          },
        },
      },

      response: {
        200: {
          type: "object",
          properties: {
            "@context": {
              type: "array",
              items: { type: "string", format: "uri" },
            },
            id: {
              type: "string",
              format: "uri",
              description: 'if "vcId" property was present in request body',
            },
            issuanceDate: { type: "string", format: "date-time" },
            issuer: { type: "string", format: "did" },
            type: {
              type: "array",
              items: {
                type: "string",
                values: [VCType.VerifiableCredential, VCType.Empty],
              },
            },
            proof: {
              type: "object",
              properties: {
                type: { type: "string", value: ProofType.JsonWebSignature2020 },
                created: { type: "string", format: "date-time" },
                proofPurpose: { type: "string" },
                verificationMethod: { type: "string" },
                jws: { type: "string", format: "jws" },
              },
              required: [
                "type",
                "created",
                "proofPurpose",
                "verificationMethod",
                "jws",
              ],
            },
          },
          required: ["proof", "type", "issuer", "issuanceDate", "@context"],
          example: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            id: "https://example.com",
            issuanceDate: "2023-01-30T14:58:17.673Z",
            issuer: "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr",
            type: ["VerifiableCredential", "EmptyCredential"],
            proof: {
              type: "JsonWebSignature2020",
              created: "2023-01-30T14:58:17.680Z",
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr#z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr",
              jws: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2VxNFR5VGRBTkQ2SlRNS3VDVld0aVBpN1Y0dm5MSzhMbldTcUVRclF6MkdyI3o2TWtlcTRUeVRkQU5ENkpUTUt1Q1ZXdGlQaTdWNHZuTEs4TG5XU3FFUXJRejJHciJ9..ZIJbUgGkWPxDiEnL8Uemi2VT2H7Wn-f8m0M89rqMtERTjuw1vHJUXdUuD82mGk0ffP7dMHsA3dczhPmR7qEEAw",
            },
          },
        },
      },
    },
  },
};
