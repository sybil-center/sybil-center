import dotenv, { type DotenvConfigOutput } from "dotenv";

export type DotenvConfigOptions = {
  path?: string | URL;
  override?: boolean;
};

function configENV(options?: DotenvConfigOptions): DotenvConfigOutput {
  return dotenv.config(options);
}

export class Config {

  /** Protocol e.g. http or https */
  readonly protocol: string;
  /** Http internal server host */
  readonly host: string;
  /** Http expose server domain */
  readonly exposeDomain: URL;
  /** Http server port */
  readonly port: number;
  /** Ethereum Sybil contract owner (contract.owner) private key as "0xhex" */
  readonly ethSybilContractOwnerPrivateKey: string;
  /** Ethereum Sybil contract address */
  readonly ethSybilContractAddress: string;
  /** Secret string, for encryption, signing and etc */
  readonly secret: string;
  // /** Frontend client application origin */
  // readonly frontendOrigin: string;

  readonly db: {
    url: string;
  }

  constructor(envFilePath?: URL) {
    if (envFilePath) configENV({ path: envFilePath, override: true });
    else configENV();
    this.protocol = process.env["PROTOCOL"] || "http";
    this.host = process.env["HOST"] || "0.0.0.0";
    this.port = process.env["PORT"] ? Number(process.env["PORT"]) : 8080;
    this.exposeDomain = new URL(ENV.getUrlOrThrow("PATH_TO_EXPOSE_DOMAIN").origin);
    this.ethSybilContractOwnerPrivateKey = ENV.getStringOrThrow("ETH_SYBIL_CONTRACT_OWNER_PRIVATE_KEY");
    this.ethSybilContractAddress = ENV.getStringOrThrow("ETH_SYBIL_CONTRACT_ADDRESS");
    this.db = {
      url: ENV.getStringOrThrow("DB_URL")
    }
    this.secret = ENV.getStringOrThrow("SECRET");
    // this.frontendOrigin = ENV.getStringOrThrow("FRONTEND_ORIGIN");
  }
}

const ENV = {
  getStringOrThrow(key: string) {
    const value = process.env[key];
    if (!value) throw new Error(
      `Can not find ENV "${value}" variable `
    );
    return value;
  },

  getUrlOrThrow(key: string): URL {
    const url = ENV.getStringOrThrow(key);
    return new URL(url);
  }
};