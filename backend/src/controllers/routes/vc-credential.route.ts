import { CredentialRoutes, Route } from "../../services/vc/vc-route.js";
import { ethereumAccountRoutes } from "../../issuers/vc/ethereum-account/index.js";
import { twitterAccountRoutes } from "../../issuers/vc/twitter-account/index.js";
import { githubAccountRoutes } from "../../issuers/vc/github-account/index.js";
import { discordAccountRoutes } from "../../issuers/vc/discord-account/index.js";
import { verifyCredentialEP } from "@sybil-center/sdk/util";

export const genVCRotes: CredentialRoutes[] = [
  ethereumAccountRoutes,
  twitterAccountRoutes,
  githubAccountRoutes,
  discordAccountRoutes,
];

export const verifyCredentialRoute: Route = {
  method: ["POST"],
  url: verifyCredentialEP(),
  schema: {
    tags: ["Verify credential"],
    body: {
      type: "object",
      nullable: false,
      required: [
        "@context",
        "type",
        "issuer",
        "credentialSubject",
        "issuanceDate",
        "proof"
      ],
      properties: {
        "@context": {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            type: "string",
          }
        },
        type: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            type: "string"
          }
        },
        issuer: {
          anyOf: [
            { type: "string" },
            {
              type: "object",
              required: ["id"],
              properties: {
                id: { type: "string" }
              }
            }
          ]
        },
        credentialSubject: {
          type: "object",
          properties: {
            id: { type: "string" }
          }
        },
        issuanceDate: {
          type: "string",
          format: "date-time"
        },
        proof: {
          type: "object",
          required: ["type", "verificationMethod"],
          properties: {
            type: { type: "string" },
            verificationMethod: { type: "string"},
            jws: { type: "string"}
          }
        },
        expirationDate: {
          type: "string",
          format: "date-time"
        },
        id: { type: "string" },
      }
    }
  }
};
