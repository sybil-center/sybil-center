import { appConfig } from "../config/app-config";
import { Sybil } from "@sybil-center/sdk";

export const sybil = new Sybil(
  {
    apiKey: "4O19Qku9DSjx8aNQMXq1RMVieeEAS4j-ZonRs5KLNMOu4TesKX6zo4bnC26G8JYSuLz7Eda6YrxuNFHaTE4ouA"
  }, appConfig.vcIssuerDomain);
