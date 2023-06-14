import { Injector } from "typed-inject";
import { HttpServer } from "../../backbone/http-server.js";
import { toContext } from "../../util/context.util.js";

type Dependencies = {
  httpServer: HttpServer;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer"
];

export function oauthPageController(injector: Injector<Dependencies>) {
  const { fastify } = toContext(tokens, injector).httpServer;
  fastify.route({
    method: "GET",
    url: "/oauth/authorized",
    handler: async (_, reply) => {
      await reply.sendFile("oauth/oauth-redirect.html");
    },
  });
}
