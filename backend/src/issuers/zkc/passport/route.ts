import { ZkCredRoutes } from "../../../base/types/route.js";
import { ID_TYPES, PROOF_TYPES, util as sybil } from "@sybil-center/zkc-core";

const tags = ["ZKC Passport Zero Knowledge Credential"];

export const ZkcPassportRoutes: ZkCredRoutes = {
  schemaName: "passport",

  challenge: {
    method: ["POST"],
    url: sybil.EPs.v1("passport").challenge,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: [
          "subjectId"
        ],
        properties: {
          subjectId: {
            type: "object",
            required: [
              "t",
              "k"
            ],
            properties: {
              t: { enum: ID_TYPES },
              k: { type: "string" }
            }
          },
          options: {
            type: "object",
            nullable: true,
            properties: {
              expirationDate: {
                type: "number",
                nullable: true
              },
              proofTypes: {
                type: "array",
                items: { enum: PROOF_TYPES },
                nullable: true
              },
              mina: {
                type: "object",
                nullable: true,
                properties: {
                  network: {
                    type: "string",
                    nullable: true
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  canIssue: {
    method: ["POST"],
    url: sybil.EPs.v1("passport").canIssue,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["sessionId"],
        properties: {
          sessionId: { type: "string" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            canIssue: { type: "boolean" }
          }
        }
      }
    }
  },

  issue: {
    method: ["POST"],
    url: sybil.EPs.v1("passport").issue,
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
  }

};
