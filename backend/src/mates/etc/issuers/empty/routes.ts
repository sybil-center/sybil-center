import { CredentialRoutes } from "../../../../base/model/route/route.js";
import { issueEP } from "@sybil-center/sdk/util";

const tags = ["Empty verifiable credential"];
export const emptyRoutes: CredentialRoutes = {
  credentialType: "Empty",

  issue: {
    method: ["POST"],
    url: issueEP("Empty"),
    schema: {
      tags: tags,

      body: {
        type: "object",
      },
    },
  },
};
