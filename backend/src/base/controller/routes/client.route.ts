import { Route } from "../../types/route.js";
import {
  selfFindClientEP,
  selfIsLoggedInClientEP,
  selfLoginClientEP,
  selfLogoutClientEP,
  selfUpdateClientEP
} from "../../../util/route.util.js";
import { credentialSchema } from "../../schemas/credential.schema.js";

export const clientLoginRoute: Route = {
  method: ["POST"],
  url: selfLoginClientEP,
  schema: {
    body: {
      type: "object",
      properties: {
        credential: credentialSchema,
        captchaToken: {
          type: "string",
          nullable: true
        }
      }
    }
  }
};

export const clientIsLoggedInRoute: Route = {
  method: ["GET"],
  url: selfIsLoggedInClientEP,
};

export const clientLogoutRoute: Route = {
  method: ["GET"],
  url: selfLogoutClientEP,
};

export const selfClientUpdateRoute: Route = {
  method: ["PATCH"],
  url: selfUpdateClientEP,
  schema: {
    body: {
      type: "object",
      required: ["requirements", "client"],
      additionalProperties: false,
      properties: {
        requirements: {
          type: "object",
          required: ["credential"],
          additionalProperties: false,
          properties: {
            credential: credentialSchema,
            captchaToken: {
              type: "string",
              nullable: true
            }
          }
        },
        client: {
          type: "object",
          required: [
            "restrictionURIs",
            "customSchemas"
          ],
          additionalProperties: false,
          properties: {
            restrictionURIs: {
              nullable: true,
              type: "array",
              maxItems: 25,
              uniqueItems: true,
              items: {
                type: "string",
                maxLength: 200
              }
            },
            customSchemas: {
              nullable: true,
              type: "array",
              maxItems: 10,
              items: {
                type: "object"
              }
            }
          }
        }
      }
    }
  }
};

export const selfClientFindRoute: Route = {
  method: ["GET"],
  url: selfFindClientEP,
};
