import { VCRoutes } from "../../../../base/model/route/route.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { issueEP } from "../../../../util/vc-route-util.js";

const tags = ["Empty verifiable credential"];
export const emptyRoutes: VCRoutes = {
  vcType: VCType.Empty,

  issue: {
    method: ["POST"],
    url: issueEP(VCType.Empty),
    schema: {
      tags: tags,

      body: {
        type: "object",
        properties: {
          vcId: {
            type: ["string"],
            description: `optional: id of verifiable credential.
                          If undefined id of vc will not present in response`,
            format: "uri",
          },
        },
      },
    },
  },
};
