import * as t from "io-ts";
import { bytesAsB64U, jsonAsBytes } from "./io-ts-extra.js";

/**
 * OAuth "state" passed from requestor all the way to our callback.
 */
export const OAuthState = t.string
  .pipe(bytesAsB64U)
  .pipe(jsonAsBytes)
  .pipe(
    t.type({
      sessionId: t.string,
      credentialType: t.string,
      isZKC: t.union([t.boolean, t.undefined])
    })
  );
export type OAuthState = t.TypeOf<typeof OAuthState>;

/**
 * Response from OAuth server contains `access_token`.
 */
export const AccessTokenResponse = t.exact(
  t.type({
    access_token: t.string,
  })
);

/**
 * Interface for get User information by OAuth2 code granted flow
 */
export interface IOAuthService<TLinkReq, TLinkRes, TTokenReq> {
  /**
   * Generate OAuth2 link to user authorization in service
   * @param request object contains properties to generate link for user authorization
   */
  getOAuthLink(request: TLinkReq): TLinkRes;

  /**
   *
   * @param request args necessary to get access token from service
   */
  getAccessToken(request: TTokenReq): Promise<string>;
}
