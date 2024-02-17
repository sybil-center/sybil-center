import { ZCredRoutes } from "../../controllers/zcred-issuer/types.js";
import { ID_TYPES, zcredjs } from "@zcredjs/core";
import { sybil } from "../../services/sybiljs/index.js";


const tags = ["ZCred Passport Credential"];

export const PASSPORT_ROUTES: ZCredRoutes = {
  credentialType: "passport",
  info: {
    method: "GET",
    url: sybil.issuerPath("passport").info,
    schema: {
      tags: tags
    }
  },
  challenge: {
    method: "POST",
    url: sybil.issuerPath("passport").challenge,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["subject", "validUntil", "options"],
        properties: {
          subject: {
            type: "object",
            required: ["id"],
            properties: {
              id: {
                type: "object",
                required: ["type", "key"],
                properties: {
                  type: { enum: ID_TYPES },
                  key: { type: "string" },
                }
              }
            }
          },
          validUntil: { type: "string", format: "date-time" },
          options: {
            type: "object",
            required: ["chainId"],
            properties: {
              chainId: { type: "string", pattern: zcredjs.chainIdReqexp },
              redirectURL: { type: "string", nullable: true }
            }
          }
        }
      }
    }
  },

  canIssue: {
    method: "POST",
    url: sybil.issuerPath("passport").canIssue,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["sessionId"],
        properties: {
          sessionId: { type: "string" }
        }
      }
    }
  },

  issue: {
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["sessionId", "signature"],
        properties: {
          sessionId: { type: "string" },
          signature: { type: "string" }
        }
      }
    }
  },
};