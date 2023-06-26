import { ApikeyService } from "../service/apikey.service.js";
import { Credential } from "../types/credential.js";
import { findApikeysRoute, generateAPIkeysRoute } from "./routes/api-key.route.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientError } from "../../backbone/errors.js";
import { Config } from "../../backbone/config.js";
import { Injector } from "typed-inject";
import { HttpServer } from "../../backbone/http-server.js";
import { toContext } from "../../util/context.util.js";
import { IGateService } from "../service/gate.service.js";

type ApiKeyReq = {
  credential: Credential;
  captchaToken?: string;
}

type Dependencies = {
  httpServer: HttpServer;
  apikeyService: ApikeyService;
  config: Config;
  gateService: IGateService
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "apikeyService",
  "config",
  "gateService"
];

/** Controller for generating API KEYS */
export function apiKeyController(injector: Injector<Dependencies>): void {
  const {
    httpServer: { fastify },
    apikeyService,
    config,
    gateService: gate
  } = toContext(tokens, injector);

  fastify.route<{ Body: ApiKeyReq }>({
    method: generateAPIkeysRoute.method,
    url: generateAPIkeysRoute.url,
    schema: generateAPIkeysRoute.schema,
    preHandler: async (req) => {
      const { credential, captchaToken } = req.body;
      const { apiKeysCredentialTTL } = config;
      await gate.build()
        .checkFrontend(req)
        .captchaRequired(captchaToken)
        .validateCaptcha(captchaToken)
        .validateCredential(credential, {
          type: "EthereumAccount",
          ttlRange: apiKeysCredentialTTL
        })
        .verifyCredential(credential)
        .open((closed) => {
          throw new ClientError(closed.reason!, closed.errStatus);
        });
      req.body.credential = ThrowDecoder
        .decode(Credential, credential, new ClientError("Invalid credential"));
    },
    handler: async (req) => {
      const credential = req.body.credential;
      return await apikeyService.generate(credential);
    }
  });

  fastify.route({
    ...findApikeysRoute,
    handler: async () => {

    }
  });
}
