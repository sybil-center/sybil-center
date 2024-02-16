import { Route } from "../../services/vc/vc-route.js";
import { CredentialType } from "../../services/sybiljs/types/index.js";

export type ZCredRoutes = {
  info: Route;
  credentialType: CredentialType;
  challenge: Route;
  canIssue: Route;
  issue: Route;
}
