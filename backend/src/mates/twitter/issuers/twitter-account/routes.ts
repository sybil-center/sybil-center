import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { canIssueEP, challengeEP, issueEP } from "../../../../util/vc-route-util.js";

const tags = ["Twitter account ownership verifiable credential"];
export const twitterAccountRoutes: VCRoutes = {
  vcType: VCType.TwitterAccount,

  issue: {
    method: ["POST"],
    url: issueEP(VCType.TwitterAccount),
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
    url: canIssueEP(VCType.TwitterAccount),
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

  payload: {
    method: ["POST"],
    url: challengeEP(VCType.TwitterAccount),
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
