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

  readonly discordClientId: string;
  readonly discordClientSecret: string;

  readonly gitHubClientId: string;
  readonly gitHubClientSecret: string;

  readonly twitterClientId: string;
  readonly twitterClientSecret: string;

  readonly frontendOrigin: URL;

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

  /** Mina private key as base58 encoding*/
  readonly minaPrivateKey: string;

  /** Persona API KEY from sandbox */
  readonly personaApiKey: string;

  /** Secret to hide subject identifier. Uses as salt in hash function */
  readonly personaSecret: string;

  /** Persona template identifier for template verification process */
  readonly personaTemplateId: string;

  /** Persona WebHook secret to verify callbacks from persona */
  readonly personaHookSecret: string;

  /** KYC session ttl in MS */
  readonly kycSessionTtl: number;

  /** secp256k1 private key as hex string */
  readonly secp256k1PrivateKey: string;

  readonly shuftiproClientId: string;
  readonly shuftiproSecretKey: string;
  readonly shuftiproPassportTamplate: string;

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

    this.discordClientId = getStrOrThrow("DISCORD_CLIENT_ID");
    this.discordClientSecret = getStrOrThrow("DISCORD_CLIENT_SECRET");

    this.gitHubClientId = getStrOrThrow("GIT_HUB_CLIENT_ID");
    this.gitHubClientSecret = getStrOrThrow("GIT_HUB_CLIENT_SECRET");

    this.twitterClientId = getStrOrThrow("TWITTER_CLIENT_ID");
    this.twitterClientSecret = getStrOrThrow("TWITTER_CLIENT_SECRET");

    this.frontendOrigin = new URL(getStrOrThrow("FRONTEND_ORIGIN"));

    this.gcProjectId = getStrOrThrow("GC_PROJECT_ID");
    this.captchaApiKey = getStrOrThrow("CAPTCHA_API_KEY");
    this.captchaSiteKey = getStrOrThrow("CAPTCHA_SITE_KEY");
    this.captchaRequired = getBoolOrElse("CAPTCHA_REQUIRED", false);
    this.captchaValidScore = getCaptchaValidScore("CAPTCHA_VALID_SCORE", 0.7);
    this.minaPrivateKey = getStrOrThrow("MINA_PRIVATE_KEY");
    this.personaApiKey = getStrOrThrow("PERSONA_API_KEY");
    this.personaSecret = getStrOrThrow("PERSONA_SECRET");
    this.personaTemplateId = getStrOrThrow("PERSONA_TEMPLATE_ID");
    this.personaHookSecret = getStrOrThrow("PERSONA_HOOK_SECRET");

    this.kycSessionTtl = getNumOrThrow("KYC_SESSION_TTL");
    this.secp256k1PrivateKey = getStrOrThrow("SECP256K1_PRIVATE_KEY");
    this.shuftiproClientId = getStrOrThrow("SHUFTIPRO_CLIENTID");
    this.shuftiproSecretKey = getStrOrThrow("SHUFTIPRO_SECRETKEY");
    this.shuftiproPassportTamplate = getStrOrThrow("SHUFTIPRO_PASSPORT_TAMPLATE");
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

// @ts-expect-error
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
