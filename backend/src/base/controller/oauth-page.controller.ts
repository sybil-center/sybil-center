import { HttpServer } from "../../backbone/http-server.js";
import { contextUtil } from "../../util/context.util.js";
import { type Injector } from "typed-inject";

type Dependencies = {
  httpServer: HttpServer;
};

const tokens: (keyof Dependencies)[] = [
  "httpServer"
];
export function oauthPageController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify }
  } = contextUtil.from(tokens, injector);

  fastify.route({
    method: "GET",
    url: "/oauth/authorized",
    handler: async (_, reply) => {
      await reply.sendFile("oauth/oauth-redirect.html");
    },
  });
}
