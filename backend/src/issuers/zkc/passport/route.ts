import { ZkCredRoutes } from "../../../base/types/route.js";
import { zkc } from "../../../util/zk-credentials.util.js";

const tags = ["ZKC Passport Zero Knowledge Credential"];

export const ZkcPassportRoutes: ZkCredRoutes = {
  schemaName: "Passport",

  challenge: {
    method: ["POST"],
    url: zkc.EPs.v1("Passport").challenge,
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: [
          "sbjId"
        ],
        properties: {
          sbjId: {
            type: "object",
            required: [
              "t",
              "k"
            ],
            properties: {
              t: { type: "string" },
              k: { type: "string" }
            }
          },
          exd: {
            type: "number",
            nullable: true
          },
          opt: {
            type: "object",
            nullable: true
          }
        }
      }
    }
  },

  canIssue: {
    method: ["GET"],
    url: zkc.EPs.v1("Passport").canIssue,
    schema: {
      tags: tags,
      querystring: {
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
    url: zkc.EPs.v1("Passport").issue,
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
