import { configDotEnv } from "../util/dotenv.util.js";

export class Config {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly pathToExposeDomain: URL;

  /**  Secret phrase for generating DID */
  readonly secret: string;

  /**  Url of ethereum node */
  readonly ethNodeUrl: string;
  /** TTL for signature message cache in ms */
  readonly signatureMessageTTL: number;
  readonly oAuthSessionTtl: number;

  readonly frontendOrigin: URL;

  /** Mina private key as base58 encoding*/
  readonly minaPrivateKey: string;

  /** KYC session ttl in MS */
  readonly kycSessionTtl: number;

  /** secp256k1 private key as hex string */
  readonly secp256k1PrivateKey: string;

  /** Farquest (API provider for Farcaster) API KEY */
  readonly farquestApiKey: string;

  readonly neuroVisionSchemaId: string;
  readonly neuroVisionSecretKey: string;

  readonly db: {
    url: string
  };

  constructor(envFilepath?: URL) {
    if (envFilepath) {
      configDotEnv({ path: envFilepath, override: true });
    } else {
      configDotEnv();
    }
    this.protocol = process.env["PROTOCOL"] || "http";
    this.host = process.env["HOST"] || "0.0.0.0";
    this.port = process.env["PORT"] ? Number(process.env["PORT"]) : 8080;

    const origin = new URL(getStrOrThrow("PATH_TO_EXPOSE_DOMAIN")).origin;
    this.pathToExposeDomain = new URL(origin);

    this.secret = getStrOrThrow("SECRET");
    this.ethNodeUrl = getStrOrThrow("ETH_NODE_URL");
    this.signatureMessageTTL = getNumOrThrow("SIGNATURE_MESSAGE_TTL");
    this.oAuthSessionTtl = getNumOrThrow("OAUTH_SESSION_TTL");
    this.frontendOrigin = new URL(getStrOrThrow("FRONTEND_ORIGIN"));
    this.minaPrivateKey = getStrOrThrow("MINA_PRIVATE_KEY");
    this.kycSessionTtl = getNumOrThrow("KYC_SESSION_TTL");
    this.secp256k1PrivateKey = getStrOrThrow("SECP256K1_PRIVATE_KEY");
    this.farquestApiKey = getStrOrThrow("FAR_QUEST_API_KEY");
    this.neuroVisionSchemaId = getStrOrThrow("NEURO_VISION_SCHEMA_ID");
    this.neuroVisionSecretKey = getStrOrThrow("NEURO_VISION_SECRET_KEY");
    this.db = {
      url: getStrOrThrow("DB_URL")
    };
  }
}

/**
 * Get env variable as string, or throw error if not exists
 *
 * @param name of environment variable
 */
function getStrOrThrow(name: string): string {
  const value = process.env[name];
  if (value) return value;
  throw new Error(`env variable ${name} is undefined`);
}

/**
 * Get env variable as number, or throw error if not exists
 *
 * @param envVar environment variable
 */
function getNumOrThrow(envVar: string): number {
  return Number(getStrOrThrow(envVar));
}
