import { CredentialRoutes, Route } from "../../types/route.js";
import { ethereumAccountRoutes } from "../../../issuers/vc/ethereum-account/index.js";
import { twitterAccountRoutes } from "../../../issuers/vc/twitter-account/index.js";
import { githubAccountRoutes } from "../../../issuers/vc/github-account/index.js";
import { discordAccountRoutes } from "../../../issuers/vc/discord-account/index.js";
import { verifyCredentialEP } from "@sybil-center/sdk/util";
import { credentialSchema } from "../../schemas/credential.schema.js";

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
    body: credentialSchema
  }
};
