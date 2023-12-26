import { CredType } from "@zcredjs/core";
import { Route } from "../base/types/route.js";

export type ZCredRoutes = {
  credentialType: CredType;
  challenge: Route;
  canIssue: Route;
  issue: Route;
}
