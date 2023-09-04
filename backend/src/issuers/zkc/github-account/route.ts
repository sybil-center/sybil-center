import { ZkCredRoutes } from "../../../base/types/route.js";
import { zkc } from "../../../util/zk-credentials.util.js";

const tags = ["ZKC GitHub account ownership Zero Knowledge Credential"];

export const zkcGithubAccountRoutes: ZkCredRoutes = {
  schemaName: "GitHubAccount",

  challenge: {
    method: ["POST"],
    url: zkc.EPs.v1("GitHubAccount").challenge,
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
          redirectUrl: {
            type: "string",
            format: "uri",
            nullable: true
          }
        }
      }
    }
  },

  canIssue: {
    method: ["GET"],
    url: zkc.EPs.v1("GitHubAccount").canIssue,
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
    url: zkc.EPs.v1("GitHubAccount").issue,
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
