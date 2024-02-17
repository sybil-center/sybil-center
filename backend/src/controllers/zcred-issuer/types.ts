import { CredentialType } from "../../services/sybiljs/types/index.js";
import { Route } from "../../types/route.js";

export type ZCredRoutes = {
  info: Route;
  credentialType: CredentialType;
  challenge: Route;
  canIssue: Route;
  issue: Route;
}
