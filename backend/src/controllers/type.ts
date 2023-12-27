import { CredType } from "@zcredjs/core";
import { Route } from "../base/types/route.js";

export type ZCredRoutes = {
  info: Route;
  credentialType: CredType;
  challenge: Route;
  canIssue: Route;
  issue: Route;
}
