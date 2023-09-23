import { ZkcGithubAccountRoutes } from "../../../issuers/zkc/github-account/route.js";
import { ZkCredRoutes } from "../../types/route.js";
import { ZkcPassportRoutes } from "../../../issuers/zkc/passport/route.js";

export const ZkcRoutes: ZkCredRoutes[] = [
  ZkcGithubAccountRoutes,
  ZkcPassportRoutes
]
