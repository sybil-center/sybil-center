import { urlCredentialType } from "@sybil-center/sdk/util";
import { CredentialType } from "@sybil-center/sdk/types";


export function oauthCallbackEP(): string {
  return "/api/v1/vcs/oauth2/callback";
}

export function vcOAuthCallbackUrl(pathToExposeDomain: URL): URL {
  return new URL(oauthCallbackEP(), pathToExposeDomain);
}

export function ownerProofEP(type: CredentialType): string {
  return `/api/v1/vcs/${urlCredentialType(type)}/owner-proof`
}
