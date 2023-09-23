import { RouteOptions } from "fastify/types/route.js";
import { CredentialType } from "@sybil-center/sdk/types";
import { ZkcSchemaNames } from "./zkc.credential.js";

/** Base route interface each route has to implement it */
export type Route = Omit<RouteOptions, "handler">

export type CredentialRoutes = {
  credentialType: CredentialType,
  issue: Route,
  challenge?: Route,
  canIssue?: Route,
}

export type ZkCredRoutes = {
  schemaName: ZkcSchemaNames,
  issue: Route,
  challenge?: Route,
  canIssue?: Route
}
