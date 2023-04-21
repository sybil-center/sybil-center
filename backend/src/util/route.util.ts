import { Prefix } from "@sybil-center/sdk";

export function oauthCallbackEP(): string {
  return "/api/v1/vcs/oauth2/callback";
}

export function credentialOAuthCallbackURL(pathToExposeDomain: URL): URL {
  return new URL(oauthCallbackEP(), pathToExposeDomain);
}

export function generateAPIkeysEP(): string {
  return "/api/v1/keys";
}

/** Returns regexp '^(<prefix1>:.+|<prefix2>:.+| ... | <prefixN>:.+)' */
export function subjectIdRegExp(prefixes: Prefix[]): string {
  const prefixRegexp = prefixes.map((prefix) => `${prefix}:.+`);
  return `^(${prefixRegexp.join("|")})`
}
