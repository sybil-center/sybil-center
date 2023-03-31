import { appConfig } from "../config/app-config";
import { Sybil } from "@sybil-center/sdk"

export const sybil = new Sybil(appConfig.vcIssuerDomain);
