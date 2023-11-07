import { HttpServer } from "../../backbone/http-server.js";
import { contextUtil } from "../../util/context.util.js";
import { type Injector } from "typed-inject";
import { oauthCallbackRoute } from "./routes/callback.route.js";
import { OAuthQueryCallBack, OAuthState } from "../types/oauth.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { Config } from "../../backbone/config.js";
import { IssuerContainer } from "../service/issuer-container.js";

type Dependencies = {
  httpServer: HttpServer;
  config: Config;
  issuerContainer: IssuerContainer;
};

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "config",
  "issuerContainer",
];
export function oauthController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    config,
    issuerContainer,
  } = contextUtil.from(tokens, injector);

  fastify.route({
    method: "GET",
    url: "/oauth/authorized",
    handler: async (_, reply) => {
      await reply.sendFile("oauth/oauth-redirect.html");
    },
  });

  fastify.route<{ Querystring: OAuthQueryCallBack }>({
    ...oauthCallbackRoute,
    handler: async (req, resp) => {
      const query = req.query;
      const defaultRedirect = new URL(
        "/oauth/authorized",
        config.pathToExposeDomain
      );
      try {
        const state = ThrowDecoder.decode(OAuthState, query.state);
        let redirectUrl: URL | undefined;
        if (state.isZKC) {}
        else {
          redirectUrl = await issuerContainer.handleOAuthCallback(
            query.code,
            state
          );
        }
        const redirectTo = redirectUrl ? redirectUrl : defaultRedirect;
        resp.redirect(redirectTo.href);
      } catch (e) {
        resp.redirect(defaultRedirect.href);
      }
    }
  });
}
