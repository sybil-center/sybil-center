import { ServerError } from "../../../backbone/errors.js";
import * as t from "io-ts";
import { rest }  from "../../../util/fetch.util.js";
import { AccessTokenResponse, type IOAuthService, OAuthState, } from "../../types/oauth.js";
import { credentialOAuthCallbackURL } from "../../../util/route.util.js";
import { makeURL } from "../../../util/make-url.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

const OutGitHubUser = t.exact(
  t.type({
    login: t.string,
    id: t.number,
    // Provide to use page
    html_url: t.string,
    name: t.union([t.string, t.undefined]),
    // It is not url to user page. This url provide to user info JSON object
    url: t.union([t.string, t.undefined]),
  })
);

type OutGitHubUser = t.TypeOf<typeof OutGitHubUser>

const InGitHubUser = t.exact(
  t.type({
    id: t.number,
    username: t.string,
    userPage: t.string
  })
);

type InGitHubUser = t.TypeOf<typeof InGitHubUser>

const OutGithubUserAsInGithubUser = new t.Type <InGitHubUser, OutGitHubUser, OutGitHubUser>(
  "OutGithubUser-as-InGithubUser",
  (input: any): input is InGitHubUser => {
    return typeof input.id === "number" &&
      typeof input.username === "string" &&
      typeof input.userPage === "string"
  },
  (input, context) => {
    try {
      const githubUser: InGitHubUser = {
        id: input.id,
        username: input.login,
        userPage: input.html_url
      }
      return t.success(githubUser)
    } catch (e: any) {
      return t.failure(input, context, String(e))
    }
  },
  (gitHubUser) => {
    const outGithubUser: OutGitHubUser = {
      id: gitHubUser.id,
      login: gitHubUser.username,
      html_url: gitHubUser.userPage,
      name: undefined,
      url: undefined
    }
    return outGithubUser
  }
)

export const GitHubUser = OutGitHubUser.pipe(OutGithubUserAsInGithubUser);

export type GitHubUser = t.TypeOf<typeof GitHubUser>

type LinkReq = {
  sessionId: string;
  credentialType: CredentialType;
  scope: string[];
  isZKC?: boolean;
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
      return await rest.fetchDecode<GitHubUser>(
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

  getOAuthLink({ sessionId, credentialType, scope, isZKC }: LinkReq): URL {
    return makeURL("https://github.com/login/oauth/authorize", {
      redirect_uri: credentialOAuthCallbackURL(this.pathToExposeDomain).href,
      client_id: this.gitHubClientId,
      state: OAuthState.encode({
        sessionId: sessionId,
        credentialType: credentialType,
        isZKC: isZKC
      }),
      scope: scope.join("%20"),
    });
  }

  async getAccessToken(code: string): Promise<string> {
    try {
      const response = await rest.fetchDecode(
        "https://github.com/login/oauth/access_token",
        AccessTokenResponse,
        {
          method: "POST",
          body: JSON.stringify({
            code: code,
            redirect_uri: credentialOAuthCallbackURL(this.pathToExposeDomain),
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
