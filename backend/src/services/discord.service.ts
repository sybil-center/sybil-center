import * as t from "io-ts";
import { ServerErr } from "../backbone/errors.js";
import type { IOAuthService } from "../types/codec/oauth.js";
import { AccessTokenResponse, OAuthState } from "../types/codec/oauth.js";
import { credentialOAuthCallbackURL } from "../util/route.util.js";
import { rest } from "../util/fetch.util.js";
import { makeURL } from "../util/make-url.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

type LinkReq = {
  sessionId: string;
  credentialType: CredentialType;
  scope: string[];
};

const DiscordUser = t.exact(
  t.type({
    id: t.string,
    username: t.string,
    discriminator: t.string,
  })
);
export type DiscordUser = t.TypeOf<typeof DiscordUser>;

/**
 * Service for Discord interaction
 */
export class DiscordService implements IOAuthService<LinkReq, URL, string> {
  private readonly pathToExposeDomain: URL;
  private readonly discordClientSecret: string;
  private readonly discordClientId: string;

  constructor(config: {
    pathToExposeDomain: URL;
    discordClientId: string;
    discordClientSecret: string;
  }) {
    this.pathToExposeDomain = config.pathToExposeDomain;
    this.discordClientId = config.discordClientId;
    this.discordClientSecret = config.discordClientSecret;
  }

  /**
   * Get Discord user information
   * @param accessToken access token from OAuth2 flow
   */
  async getUser(accessToken: string): Promise<DiscordUser> {
    try {
      return await rest.fetchDecode(
        "https://discord.com/api/v10/users/@me",
        DiscordUser,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (e: any) {
      throw new ServerErr({
        message: "Discord api error",
        place: this.constructor.name,
        description: `Discord get user info error.`,
        cause: e
      });
    }
  }

  getOAuthLink({ sessionId, credentialType, scope }: LinkReq): URL {
    return makeURL("https://discord.com/api/oauth2/authorize", {
      client_id: this.discordClientId,
      redirect_uri: credentialOAuthCallbackURL(this.pathToExposeDomain).href,
      response_type: "code",
      state: OAuthState.encode({
        sessionId: sessionId,
        credentialType: credentialType,
        isZKC: false
      }),
      prompt: "consent",
      scope: scope.join("%20"),
    });
  }

  async getAccessToken(code: string): Promise<string> {
    try {
      const response = await rest.fetchDecode(
        "https://discord.com/api/v10/oauth2/token",
        AccessTokenResponse,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: this.discordClientId,
            client_secret: this.discordClientSecret,
            code: code,
            redirect_uri: credentialOAuthCallbackURL(this.pathToExposeDomain).href,
            grant_type: "authorization_code",
          }),
        }
      );
      return response.access_token;
    } catch (e: any) {
      throw new ServerErr({
        message: "Discord api error",
        cause: e,
        place: this.constructor.name,
        description: `Discord get access token error`
      });
    }
  }
}
