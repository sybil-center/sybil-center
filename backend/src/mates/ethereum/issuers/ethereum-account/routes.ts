import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ProofType } from "@sybil-center/sdk";
import { issueEP, challengeEP, ownerProofEP } from "../../../../util/vc-route-util.js";

const tags = ["Ethereum account ownership verifiable credential"];
export const ethereumAccountRoutes: VCRoutes = {
  vcType: VCType.EthereumAccount,

  issue: {
    method: ["POST"],
    url: issueEP(VCType.EthereumAccount),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          signature: { type: "string" },
          publicId: { type: "string" },
          signAlg: { type: "string" }
        },
        required: ["sessionId", "signature", "publicId"],
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
            credentialSubject: {
              type: "object",
              additionalProperties: true,
              required: ["id"],
              description: `Properties takes from request body filed "credentialSubject".
                            Also add "id" property as ETH did:pkh`,
            },
            issuanceDate: { type: "string", format: "date-time" },
            issuer: {
              type: "object",
              properties: {
                id: { type: "string", format: "did" },
              },
            },
            type: {
              type: "array",
              items: {
                type: "string",
                values: [VCType.VerifiableCredential, VCType.EthereumAccount],
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
          required: [
            "proof",
            "type",
            "issuer",
            "issuanceDate",
            "@context",
            "credentialSubject",
          ],
          example: {
            "@context": ["https://www.w3.org/2018/credentials/v1"],
            credentialSubject: {
              id: "did:pkh:eip155:1:0xb9Baa2979F62c806Ca3fE8f6932E82Bb416112aA",
              name: "Pavel",
              value: "123",
            },
            issuanceDate: "2023-01-31T10:29:38.905Z",
            issuer: "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr",
            type: ["VerifiableCredential", "EthAccountOwnershipCredential"],
            proof: {
              type: "JsonWebSignature2020",
              created: "2023-01-31T10:29:38.917Z",
              proofPurpose: "assertionMethod",
              verificationMethod:
                "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr#z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr",
              jws: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2VxNFR5VGRBTkQ2SlRNS3VDVld0aVBpN1Y0dm5MSzhMbldTcUVRclF6MkdyI3o2TWtlcTRUeVRkQU5ENkpUTUt1Q1ZXdGlQaTdWNHZuTEs4TG5XU3FFUXJRejJHciJ9..cbkiL5uIjN_ncHSb7jeFr1BOuLp1A6EyYZ0yDUYumPEPojcMVi5ycP2jqC2TeWkZQuishSPMzk42yQqZ6XOvBg",
            },
          },
        },
      },
    },
  },

  payload: {
    method: ["POST"],
    url: challengeEP(VCType.EthereumAccount),
    schema: {
      tags: tags,
      body: {
        anyOf: [
          {
            type: "null",
          },
          {
            type: "object",
            properties: {
              custom: {
                anyOf: [{ type: "null" }, { type: "object" }],
              },
            },
          },
        ],
      },
    },
  },

  ownerProof: {
    method: "POST",
    url: ownerProofEP(VCType.EthereumAccount),
    schema: {
      tags: tags,
      body: {
        publicId: { type: "string"},
        signature: { type: "string" },
        sessionId: { type: "string" }
      }
    }
  }
};
