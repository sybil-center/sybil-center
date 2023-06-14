import { ApiKeyService } from "../service/api-key.service.js";
import { Credential } from "../types/credential.js";
import { generateAPIkeysRoute } from "./routes/api-key.route.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientError } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { Config } from "../../backbone/config.js";
import { Injector } from "typed-inject";
import { HttpServer } from "../../backbone/http-server.js";
import { toContext } from "../../util/context.util.js";

type ApiKeyReq = {
  credential: Credential;
  captchaToken?: string;
}

type Dependencies = {
  httpServer: HttpServer;
  apiKeyService: ApiKeyService;
  config: Config;
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "apiKeyService",
  "config"
];

/** Controller for generating API KEYS */
export function apiKeyController(injector: Injector<Dependencies>): void {
  const { httpServer: { fastify }, apiKeyService, config } = toContext(tokens, injector);

  fastify.route<{ Body: ApiKeyReq }>({
    method: generateAPIkeysRoute.method,
    url: generateAPIkeysRoute.url,
    schema: generateAPIkeysRoute.schema,
    preHandler: async (req) => {
      const frontendDomain = config.frontendOrigin.origin;
      const referer = req.headers.referer;
      if (!referer) throw new ClientError("Referer header is undefined", 403);
      const refererDomain = new URL(referer).origin;
      if (refererDomain !== frontendDomain) {
        throw new ClientError("Forbidden", 403);
      }
      const credential = req.body.credential;
      req.body.credential = ThrowDecoder
        .decode(Credential, credential, new ClientError("Invalid credential"));
    },
    handler: async (req) => {
      const credential = req.body.credential as EthAccountVC;
      const captchaToken = req.body.captchaToken;
      if (config.captchaRequired && !captchaToken) {
        throw new ClientError("CAPTCHA token required");
      }
      return await apiKeyService.generate({
        credential: credential,
        captchaToken: captchaToken
      });
    }
  });
}
