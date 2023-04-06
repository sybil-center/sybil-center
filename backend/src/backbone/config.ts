import { configDotEnv } from "../util/dotenv.util.js";

export class Config {
  readonly protocol: string;
  readonly host: string;
  readonly port: number;
  readonly pathToExposeDomain: URL;

  /**
   * Secret phrase for generating DID
   */
  readonly secret: string;

  /**
   * Size limit in bytes for custom property for Verifiable Credential
   */
  readonly customSizeLimit: number;

  /**
   * Url of ethereum node
   */
  readonly ethNodeUrl: string;
  /**
   * TTL for signature message cache in ms
   */
  readonly signatureMessageTTL: number;
  readonly oAuthSessionTtl: number;

  readonly discordClientId: string;
  readonly discordClientSecret: string;

  readonly gitHubClientId: string;
  readonly gitHubClientSecret: string;

  readonly twitterClientId: string;
  readonly twitterClientSecret: string;

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

function getNumOrElse(envVar: string, defaultNum: number): number {
  const num = process.env[envVar];
  return num ? Number(num) : defaultNum;
}
