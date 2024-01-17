import { ZCredRoutes } from "../../../controllers/type.js";
import { ID_TYPES, zcredjs } from "@zcredjs/core";


const tags = ["ZCred Passport Credential"];

export const PASSPORT_TEST_ROUTES: ZCredRoutes = {
  credentialType: "passport-test",
  info: {
    method: "GET",
    url: zcredjs.issuerPath("passport-test").info,
    schema: {
      tags: tags
    }
  },
  challenge: {
    method: "POST",
    url: zcredjs.issuerPath("passport-test").challenge,
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
    url: zcredjs.issuerPath("passport-test").canIssue,
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
    url: zcredjs.issuerPath("passport-test").issue,
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
