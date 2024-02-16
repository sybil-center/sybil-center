import { CredentialRoutes } from "../../../services/vc/vc-route.js";
import { challengeEP, issueEP, canIssueEP } from "@sybil-center/sdk/util";
import { ethAccountProps } from "@sybil-center/sdk/types";
import { subjectIdRegExp } from "../../../util/route.util.js";

const tags = ["Ethereum account ownership verifiable credential"];
export const ethereumAccountRoutes: CredentialRoutes = {
  credentialType: "EthereumAccount",

  issue: {
    method: ["POST"],
    url: issueEP("EthereumAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        properties: {
          sessionId: { type: "string" },
          signature: { type: "string" },
        },
        required: ["sessionId", "signature"]
      },
    }
  },

  canIssue: {
    method: ["GET"],
    url: canIssueEP("EthereumAccount"),
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
    url: challengeEP("EthereumAccount"),
    schema: {
      tags: tags,
      body: {
        type: "object",
        required: ["subjectId"],
        properties: {
          subjectId: {
            type: "string",
            pattern: subjectIdRegExp(["did:pkh:eip155:1", "eip155:1", "ethereum"])
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
              "enum": ethAccountProps
            },
            nullable: true
          }
        }
      }
    }
  }
};
