import { RouteOptions } from "fastify/types/route.js";
import { CredentialType } from "@sybil-center/sdk/types";

/** Base route interface each route has to implement it */
export type Route = Omit<RouteOptions, 'handler'>

export type CredentialRoutes = {
  credentialType: CredentialType,
  issue: Route,
  challenge?: Route,
  canIssue?: Route,
}
