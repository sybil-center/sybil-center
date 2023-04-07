export function oauthCallbackEP(): string {
  return "/api/v1/vcs/oauth2/callback";
}

export function credentialOAuthCallbackURL(pathToExposeDomain: URL): URL {
  return new URL(oauthCallbackEP(), pathToExposeDomain);
}
