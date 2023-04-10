import { CredentialRoutes, Route } from "../../types/route.js";
import { ethereumAccountRoutes } from "../../../mates/ethereum/issuers/ethereum-account/index.js";
import { emptyRoutes } from "../../../mates/etc/issuers/empty/index.js";
import { twitterAccountRoutes } from "../../../mates/twitter/issuers/twitter-account/index.js";
import { githubAccountRoutes } from "../../../mates/github/issuers/github-account/index.js";
import { discordAccountRoutes } from "../../../mates/discord/issuers/discord-account/index.js";
import { verifyCredentialEP } from "@sybil-center/sdk/util";
import { credentialSchema } from "../../schemas/credential.schema.js";

export const genVCRotes: CredentialRoutes[] = [
  emptyRoutes,
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
