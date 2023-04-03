import { Route } from "../../model/route/route.js";
import { oauthCallbackEP } from "../../../util/route.util.js";

const tags = ["VC OAuth2 callback"];

export const vcOAuthCallback: Route = {
  method: ["GET"],
  url: oauthCallbackEP(),
  schema: {
    tags: tags,
    querystring: {
      type: "object",
      properties: {
        code: { type: "string" },
        state: { type: "string" },
      },
    },
  },
};
