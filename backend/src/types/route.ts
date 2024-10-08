import type { RouteOptions } from "fastify/types/route.js";


/** Base route interface each route has to implement it */
export type Route = Omit<RouteOptions, "handler">
