import { Route } from "../../types/route.js";
import { findApikeysEP, generateAPIkeysEP } from "../../../util/route.util.js";
import { credentialSchema } from "../../schemas/credential.schema.js";

export const generateAPIkeysRoute: Route = {
  method: ["POST"],
  url: generateAPIkeysEP(),
  schema: {
    body: {
      type: "object",
      required: [
        "credential"
      ],
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

export const findApikeysRoute: Route = {
  method: ["GET"],
  url: findApikeysEP
};
