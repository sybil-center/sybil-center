import { Route } from "../../types/route.js";

export const personaWebhookEP = "/api/v1/kyc/callback";

export const personaWebhookRoute: Route = {
  method: ["POST"],
  url: personaWebhookEP,
  schema: {
    headers: {
      type: "object",
      required: [
        "Persona-Signature"
      ],
      properties: {
        "Persona-Signature": {
          type: "string"
        }
      }
    }
  }
};
