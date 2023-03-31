import { RouteOptions } from "fastify/types/route.js";
import { VCType } from "../const/vc-type.js";

/**
 * Base route interface each route has to implement it
 */
export type Route = Omit<RouteOptions, 'handler'>

export interface VCRoutes {
  vcType: VCType,
  issue: Route,
  payload?: Route,
  canIssue?: Route,
  ownerProof?: Route
}
