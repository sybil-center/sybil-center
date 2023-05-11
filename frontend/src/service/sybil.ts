import { appConfig } from "../config/app-config";
import { Sybil } from "@sybil-center/sdk";

export const sybil = new Sybil(
  {
    apiKey: "" // backend knows what is frontend 'backend/.env -> FRONTEND_ORIGIN'
  }, appConfig.vcIssuerDomain);
