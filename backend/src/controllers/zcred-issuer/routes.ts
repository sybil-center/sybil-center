import { ZCredRoutes } from "../type.js";
import { PASSPORT_ROUTES } from "../../issuers/zcred/passport/routes.js";
import { PASSPORT_TEST_ROUTES } from "../../issuers/zcred/passport-test/routes.js";

export const ZCRED_ISSUERS_ROUTES: ZCredRoutes[] = [
  PASSPORT_ROUTES,
  PASSPORT_TEST_ROUTES
];
