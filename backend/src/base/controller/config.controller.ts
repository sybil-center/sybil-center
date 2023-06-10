import { FastifyInstance } from "fastify";
import { Config } from "../../backbone/config.js";

export function configController(fastify: FastifyInstance, config: Config) {
  fastify.get("/api/v1/config/captcha-required", () => {
    return { captchaRequired: config.captchaRequired };
  });
}
