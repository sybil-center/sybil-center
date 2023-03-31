import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { canIssueEP, issueEP, challengeEP } from "../../../../util/vc-route-util.js";

const tags = ["GitHub account ownership verifiable credential"];
export const githubAccountRoutes: VCRoutes = {
  vcType: VCType.GitHubAccount,

  issue: {
    method: ["POST"],
    url: issueEP(VCType.GitHubAccount),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          publicId: { type: "string" },
          signAlg: { type: "string" },
          signature: { type: "string" },
        },
        required: ["sessionId", "signature", "publicId"],
      },
    },
  },

  canIssue: {
    method: ["GET"],
    url: canIssueEP(VCType.GitHubAccount),
    schema: {
      querystring: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
        },
        required: ["sessionId"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            canIssue: { type: "boolean" },
          },
        },
      },
    },
  },

  payload: {
    method: ["POST"],
    url: challengeEP(VCType.GitHubAccount),
    schema: {
      tags: tags,
      body: {
        anyOf: [
          {
            type: "null",
          },
          {
            type: "object",
            properties: {
              redirectUrl: { type: "string", format: "uri" },
              custom: {
                anyOf: [{ type: "null" }, { type: "object" }],
              },
            },
          },
        ],
      },
      response: {
        200: {
          type: "object",
          properties: {
            authUrl: { type: "string" },
            sessionId: { type: "string" },
            issueChallenge: { type: "string" },
          },
        },
      },
    },
  },
};
