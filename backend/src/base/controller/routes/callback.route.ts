import { Route } from "../../types/route.js";
import { oauthCallbackEP } from "../../../util/route.util.js";


export const vcOAuthCallback: Route = {
  method: ["GET"],
  url: oauthCallbackEP(),
  schema: {
    querystring: {
      type: "object",
      properties: {
        code: { type: "string" },
        state: { type: "string" },
      },
    },
  },
};
