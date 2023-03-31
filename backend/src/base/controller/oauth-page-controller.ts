import type { FastifyInstance } from "fastify";

export function oauthPageController(fastify: FastifyInstance) {
  fastify.route({
    method: "GET",
    url: "/oauth/authorized",
    handler: async (request, reply) => {
      await reply.sendFile("oauth/oauth-redirect.html");
    },
  });
}
