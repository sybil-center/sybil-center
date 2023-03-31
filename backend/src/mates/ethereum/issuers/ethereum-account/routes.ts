import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ProofType } from "@sybil-center/sdk";
import { challengeEP, issueEP, ownerProofEP } from "../../../../util/vc-route-util.js";

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
        required: ["sessionId", "signature", "publicId"]
      },
    }
  },

  payload: {
    method: ["POST"],
    url: challengeEP(VCType.EthereumAccount),
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
    url: ownerProofEP(VCType.EthereumAccount),
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
