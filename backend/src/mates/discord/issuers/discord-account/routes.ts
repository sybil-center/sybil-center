import { CredentialRoutes } from "../../../../base/model/route/route.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";


const tags = ["Discord account ownership verifiable credential"];
export const discordAccountRoutes: CredentialRoutes = {

  credentialType: "DiscordAccount",

  issue: {
    method: ["POST"],
    url: issueEP("DiscordAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          signAlg: { type: "string" },
          publicId: { type: "string" },
          signature: { type: "string" }
        },
        required: ["sessionId", "signature", "publicId"]
      }
    }
  },

  canIssue: {
    method: ["GET"],
    url: canIssueEP("DiscordAccount"),
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
    url: challengeEP("DiscordAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        nullable: true,
        properties: {
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
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            authUrl: { type: "string" },
            sessionId: { type: "string" },
            issueChallenge: { type: "string" }
          }
        }
      }
    }
  }
};
