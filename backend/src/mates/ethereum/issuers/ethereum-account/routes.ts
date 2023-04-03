import { CredentialRoutes } from "../../../../base/model/route/route.js";
import { challengeEP, issueEP, ownerProofEP } from "@sybil-center/sdk/util";

const tags = ["Ethereum account ownership verifiable credential"];
export const ethereumAccountRoutes: CredentialRoutes = {
  credentialType: "EthereumAccount",

  issue: {
    method: ["POST"],
    url: issueEP("EthereumAccount"),
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
        required: ["sessionId", "signature", "publicId"]
      },
    }
  },

  challenge: {
    method: ["POST"],
    url: challengeEP("EthereumAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        nullable: true,
        properties: {
          custom: { type: "object", nullable: true },
          expirationDate: {
            type: "string",
            format: "date-time",
            nullable: true
          }
        }
      }
    }
  },

  ownerProof: {
    method: "POST",
    url: ownerProofEP("EthereumAccount"),
    schema: {
      tags: tags,
      body: {
        publicId: { type: "string" },
        signature: { type: "string" },
        sessionId: { type: "string" }
      }
    }
  }
};
