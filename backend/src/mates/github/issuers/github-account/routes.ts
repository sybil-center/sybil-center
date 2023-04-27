import { CredentialRoutes } from "../../../../base/types/route.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";
import { githubAccountProps, prefixList } from "@sybil-center/sdk/types";
import { subjectIdRegExp } from "../../../../util/route.util.js";

const tags = ["GitHub account ownership verifiable credential"];
export const githubAccountRoutes: CredentialRoutes = {
  credentialType: "GitHubAccount",

  issue: {
    method: ["POST"],
    url: issueEP("GitHubAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          signature: { type: "string" }
        },
        required: ["sessionId", "signature"]
      }
    }
  },

  canIssue: {
    method: ["GET"],
    url: canIssueEP("GitHubAccount"),
    schema: {
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
    url: challengeEP("GitHubAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["subjectId"],
        properties: {
          subjectId: {
            type: "string",
            pattern: subjectIdRegExp(prefixList.concat())
          },
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
          },
          props: {
            type: "array",
            items: {
              "enum": githubAccountProps
            },
            nullable: true
          }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            authUrl: { type: "string" },
            sessionId: { type: "string" },
            issueMessage: { type: "string" }
          }
        }
      }
    }
  }
};
