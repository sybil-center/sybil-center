import { CredentialRoutes } from "../../../../base/types/route.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";

const tags = ["Twitter account ownership verifiable credential"];
export const twitterAccountRoutes: CredentialRoutes = {
  credentialType: "TwitterAccount",

  issue: {
    method: ["POST"],
    url: issueEP("TwitterAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          signType: { type: "string" },
          signature: { type: "string" }
        },
        required: ["sessionId", "signature", "signType"]
      }
    }
  },

  canIssue: {
    method: ["GET"],
    url: canIssueEP("TwitterAccount"),
    schema: {
      tags: tags,
      querystring: {
        type: "object",
        properties: {
          sessionId: { type: "string" }
        },
        required: ["sessionId"]
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

  challenge: {
    method: ["POST"],
    url: challengeEP("TwitterAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["publicId"],
        properties: {
          publicId: { type: "string" },
          redirectUrl: {
            type: "string",
            format: "uri",
            nullable: true
          },
          custom: {
            type: "object",
            nullable: true
          },
          expirationDate: {
            type: "string",
            format: "date-time",
            nullable: true
          }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            authUrl: { type: "string", format: "uri" },
            sessionId: { type: "string" },
            issueChallenge: { type: "string" }
          }
        }
      }
    }
  }
};
