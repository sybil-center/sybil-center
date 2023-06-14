import { Config } from "../../backbone/config.js";
import { HttpServer } from "../../backbone/http-server.js";
import { Injector } from "typed-inject";
import { toContext } from "../../util/context.util.js";

type Dependencies = {
  httpServer: HttpServer;
  config: Config;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "config"
];

export function configController(injector: Injector<Dependencies>) {
  const { httpServer: { fastify }, config } = toContext(tokens, injector);
  fastify.get("/api/v1/config/captcha-required", () => {
    return { captchaRequired: config.captchaRequired };
  });
}
