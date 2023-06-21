import { configDotEnv } from "../util/dotenv.util.js";

export class Config {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly pathToExposeDomain: URL;

  /**  Secret phrase for generating DID */
  readonly secret: string;

  /** Size limit in bytes for custom property for Verifiable Credential */
  readonly customSizeLimit: number;

  /**  Url of ethereum node */
  readonly ethNodeUrl: string;
  /** TTL for signature message cache in ms */
  readonly signatureMessageTTL: number;
  readonly oAuthSessionTtl: number;

  readonly discordClientId: string;
  readonly discordClientSecret: string;

  readonly gitHubClientId: string;
  readonly gitHubClientSecret: string;

  readonly twitterClientId: string;
  readonly twitterClientSecret: string;

  readonly frontendOrigin: URL;

  /** Credential TTL (expiration date - issuing date) for generate API keys  */
  readonly apiKeysCredentialTTL: number;

  /** Google Cloud Project ID */
  readonly gcProjectId: string;

  /** Captcha site key */
  readonly captchaSiteKey: string;

  /** Captcha API KEY */
  readonly captchaApiKey: string;

  /** Configure is CAPTCHA required for application */
  readonly captchaRequired: boolean;

  /**
   * Configure humanity validation CAPTCHA score (range from 0 to 1).
   * The bigger "score", the greater the humanity
   */
  readonly captchaValidScore: number;

  /** Database connection URL, include username and password */
  readonly dbURL: string;
  /** Database name */
  readonly dbName: string;

  /** Secret for create JWT */
  readonly jwtSecret: string;

  /** Client custom schema size limit */
  readonly customSchemaSizeLimit: number;

  readonly apikeysCacheRequired: boolean;
  readonly apikeysCacheSize: number;

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

    this.customSizeLimit = getNumOrElse("CUSTOM_SIZE_LIMIT", 51200);

    this.ethNodeUrl = getStrOrThrow("ETH_NODE_URL");
    this.signatureMessageTTL = getNumOrThrow("SIGNATURE_MESSAGE_TTL");
    this.oAuthSessionTtl = getNumOrThrow("OAUTH_SESSION_TTL");

    this.discordClientId = getStrOrThrow("DISCORD_CLIENT_ID");
    this.discordClientSecret = getStrOrThrow("DISCORD_CLIENT_SECRET");

    this.gitHubClientId = getStrOrThrow("GIT_HUB_CLIENT_ID");
    this.gitHubClientSecret = getStrOrThrow("GIT_HUB_CLIENT_SECRET");

    this.twitterClientId = getStrOrThrow("TWITTER_CLIENT_ID");
    this.twitterClientSecret = getStrOrThrow("TWITTER_CLIENT_SECRET");

    this.frontendOrigin = new URL(getStrOrThrow("FRONTEND_ORIGIN"));
    this.apiKeysCredentialTTL = getNumOrThrow("API_KEYS_CREDENTIAL_TTL");

    this.gcProjectId = getStrOrThrow("GC_PROJECT_ID");
    this.captchaApiKey = getStrOrThrow("CAPTCHA_API_KEY");
    this.captchaSiteKey = getStrOrThrow("CAPTCHA_SITE_KEY");
    this.captchaRequired = getBoolOrElse("CAPTCHA_REQUIRED", false);
    this.captchaValidScore = getCaptchaValidScore("CAPTCHA_VALID_SCORE", 0.7);

    this.dbURL = getStrOrThrow("DB_URL");
    this.dbName = getStrOrThrow("DB_NAME");

    this.jwtSecret = getStrOrThrow("JWT_SECRET");

    this.customSchemaSizeLimit = getNumOrElse("CUSTOM_SCHEMA_SIZE_LIMIT", 51200);

    this.apikeysCacheSize = getNumOrElse("APIKEYS_CACHE_SIZE", 100);
    this.apikeysCacheRequired = getBoolOrElse("APIKEYS_CACHE_REQUIRED", false);
  }
}

/**
 * Get env variable as string, or throw error if not exists
 * @param name of environment variable
 */
function getStrOrThrow(name: string): string {
  const value = process.env[name];
  if (value) return value;
  throw new Error(`env variable ${name} is undefined`);
}

/**
 * Get env variable as number, or throw error if not exists
 * @param envVar environment variable
 */
function getNumOrThrow(envVar: string): number {
  return Number(getStrOrThrow(envVar));
}

function getNumOrElse(envVar: string, defaultNum: number): number {
  const num = process.env[envVar];
  return num ? Number(num) : defaultNum;
}

function getBoolOrElse(envVar: string, defaultBool: boolean): boolean {
  const variable = process.env[envVar];
  if (!variable) return defaultBool;
  if (variable === "false") return false;
  return Boolean(variable);
}

function getCaptchaValidScore(envVar: string, defaultNum: number): number {
  const num = process.env[envVar];
  const score = num ? Number(num) : defaultNum;
  if (score > 1 || score < 0) {
    throw new Error(`ENV variable - ${envVar} has to bee less then 1 and greater then 0`);
  }
  return score;
}
