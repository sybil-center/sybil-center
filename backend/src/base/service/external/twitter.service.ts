import { TwitterApi } from "twitter-api-v2";
import { ServerErr } from "../../../backbone/errors.js";
import { IOAuthService, OAuthState } from "../../types/oauth.js";
import { credentialOAuthCallbackURL } from "../../../util/route.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

export type TwitterUser = {
  id: string;
  username: string;
};

export type TwitterOAuthLink = {
  authUrl: string;
  codeVerifier: string;
};

export type TwitterOAuthAccessTokenRequest = {
  code: string;
  codeVerifier: string;
};

export type TwitterOAuthLinkProps = {
  sessionId: string;
  credentialType: CredentialType;
  scope: string[];
};

export class TwitterService
  implements IOAuthService<
    TwitterOAuthLinkProps,
    TwitterOAuthLink,
    TwitterOAuthAccessTokenRequest
  > {
  private readonly pathToExposeDomain: URL;
  readonly twitterApi: TwitterApi;

  constructor(
    public readonly config: {
      pathToExposeDomain: URL;
      twitterClientId: string;
      twitterClientSecret: string;
    }
  ) {
    this.pathToExposeDomain = config.pathToExposeDomain;
    this.twitterApi = new TwitterApi({
      clientId: config.twitterClientId,
      clientSecret: config.twitterClientSecret,
    });
  }

  async getUser(accessToken: string): Promise<TwitterUser> {
    try {
      const { data: user } = await new TwitterApi(accessToken).v2.me();
      return user;
    } catch (e: any) {
      throw new ServerErr({
        message: "Twitter api error",
        description: `Twitter get user info api error`,
        cause: e,
        place: this.constructor.name
      });
    }
  }

  getOAuthLink({
    scope,
    sessionId,
    credentialType,
  }: TwitterOAuthLinkProps): TwitterOAuthLink {
    const link = this.twitterApi.generateOAuth2AuthLink(
      credentialOAuthCallbackURL(this.pathToExposeDomain).href,
      {
        scope: scope,
        state: OAuthState.encode({
          sessionId: sessionId,
          credentialType: credentialType,
          isZKC: false
        }),
      }
    );
    return {
      authUrl: link.url,
      codeVerifier: link.codeVerifier,
    };
  }

  async getAccessToken({
    code,
    codeVerifier,
  }: TwitterOAuthAccessTokenRequest): Promise<string> {
    try {
      const { accessToken } = await this.twitterApi.loginWithOAuth2({
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: credentialOAuthCallbackURL(this.pathToExposeDomain).href,
      });
      return accessToken;
    } catch (e: any) {
      throw new ServerErr({
        message: "Twitter api error",
        place: this.constructor.name,
        description: `Twitter get access token api error`,
        cause: e
      });
    }
  }
}
