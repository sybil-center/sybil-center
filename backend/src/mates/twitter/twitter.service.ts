import { TwitterApi } from "twitter-api-v2";
import { ServerError } from "../../backbone/errors.js";
import { IOAuthService, OAuthState } from "../../base/oauth.js";
import { vcOAuthCallbackUrl } from "../../util/vc-route-util.js";
import type { VCType } from "../../base/model/const/vc-type.js";

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
  vcType: VCType;
  scope: string[];
};

export class TwitterService
  implements
    IOAuthService<
      TwitterOAuthLinkProps,
      TwitterOAuthLink,
      TwitterOAuthAccessTokenRequest
    >
{
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
    } catch (e) {
      throw new ServerError("Twitter api error", {
        props: {
          _log: `Twitter get user info api error. Error: ${e}`,
          _place: this.constructor.name,
        },
      });
    }
  }

  getOAuthLink({
    scope,
    sessionId,
    vcType,
  }: TwitterOAuthLinkProps): TwitterOAuthLink {
    const link = this.twitterApi.generateOAuth2AuthLink(
      vcOAuthCallbackUrl(this.pathToExposeDomain).href,
      {
        scope: scope,
        state: OAuthState.encode({ sessionId: sessionId, vcType: vcType }),
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
        redirectUri: vcOAuthCallbackUrl(this.pathToExposeDomain).href,
      });
      return accessToken;
    } catch (e) {
      throw new ServerError("Twitter api error", {
        props: {
          _log: `Twitter get access token api error. Error: ${e}`,
          _place: this.constructor.name,
        },
      });
    }
  }
}
