import { ServerError } from "../../backbone/errors.js";
import * as t from "io-ts";
import { fetchDecode } from "../../util/fetch.util.js";
import { AccessTokenResponse, type IOAuthService, OAuthState, } from "../../base/types/oauth.js";
import { vcOAuthCallbackUrl } from "../../util/route.util.js";
import { makeURL } from "../../util/make-url.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

const GitHubUser = t.exact(
  t.type({
    login: t.string,
    id: t.number,
    // Provide to use page
    html_url: t.string,
    name: t.string,
    // It is not url to user page. This url provide to user info JSON object
    url: t.string,
  })
);
export type GitHubUser = t.TypeOf<typeof GitHubUser>;

type LinkReq = {
  sessionId: string;
  credentialType: CredentialType;
  scope: string[];
};

/**
 * Service for GitHub interaction
 */
export class GitHubService implements IOAuthService<LinkReq, URL, string> {
  private readonly pathToExposeDomain: URL;
  private readonly gitHubClientSecret: string;
  private readonly gitHubClientId: string;

  constructor(config: {
    pathToExposeDomain: URL;
    gitHubClientSecret: string;
    gitHubClientId: string;
  }) {
    this.pathToExposeDomain = config.pathToExposeDomain;
    this.gitHubClientSecret = config.gitHubClientSecret;
    this.gitHubClientId = config.gitHubClientId;
  }

  /**
   * Get GitHub user information
   * @param accessToken access token from OAuth2 flow
   */
  async getUser(accessToken: string): Promise<GitHubUser> {
    try {
      return await fetchDecode<GitHubUser>(
        "https://api.github.com/user",
        GitHubUser,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (e) {
      throw new ServerError("GitHub api error", {
        props: {
          _log: `GitHub get user info api error. Error: ${e}`,
          _place: this.constructor.name,
        },
      });
    }
  }

  getOAuthLink({ sessionId, credentialType, scope }: LinkReq): URL {
    return makeURL("https://github.com/login/oauth/authorize", {
      redirect_uri: vcOAuthCallbackUrl(this.pathToExposeDomain).href,
      client_id: this.gitHubClientId,
      state: OAuthState.encode({ sessionId: sessionId, credentialType: credentialType }),
      scope: scope.join("%20"),
    });
  }

  async getAccessToken(code: string): Promise<string> {
    try {
      const response = await fetchDecode(
        "https://github.com/login/oauth/access_token",
        AccessTokenResponse,
        {
          method: "POST",
          body: JSON.stringify({
            code: code,
            redirect_uri: vcOAuthCallbackUrl(this.pathToExposeDomain),
            client_id: this.gitHubClientId,
            client_secret: this.gitHubClientSecret,
          }),
        }
      );
      return response.access_token;
    } catch (e) {
      throw new ServerError("GitHub api error", {
        props: {
          _log: `GitHub get access token api error. Error: ${e}`,
          _place: this.constructor.name,
        },
      });
    }
  }
}
