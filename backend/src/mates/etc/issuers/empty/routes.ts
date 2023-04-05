import { CredentialRoutes } from "../../../../base/types/route.js";
import { issueEP, challengeEP } from "@sybil-center/sdk/util";

const tags = ["Empty verifiable credential"];
export const emptyRoutes: CredentialRoutes = {
  credentialType: "Empty",

  challenge: {
    method: ["POST"],
    url: challengeEP("Empty"),
    schema: {
      body: {
        type: "object",
        required: ["publicId"],
        properties: {
          publicId: { type: "string" }
        }
      }
    }
  },

  issue: {
    method: ["POST"],
    url: issueEP("Empty"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["signature", "sessionId", "signType"],
        properties: {
          sessionId: { type: "string" },
          signature: { type: "string" },
          signType: { type: "string" }
        }
      },
    },
  },
};
