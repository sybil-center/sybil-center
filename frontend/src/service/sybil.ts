import { appConfig } from "../config/app-config";
import { Sybil } from "@sybil-center/sdk";

export const sybil = new Sybil(
  {
    apiKey: "ak_uC4OLPfHiOm8nNxEhUT-m9tAZBv6VwGL4NCDe3wP0SNJzwBiF-uyHoiNHhLYo-Enfk-DoZ13NeCkck6N7-Eouw"
  }, appConfig.vcIssuerDomain);
