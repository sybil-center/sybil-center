import { Credential } from "../types/credential.js";
import { generateAPIkeysRoute } from "./routes/api-key.route.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientErr } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { Config } from "../../backbone/config.js";
import { HttpServer } from "../../backbone/http-server.js";
import { IGateService } from "../service/gate.service.js";
import { Injector } from "typed-inject";
import { ApiKeyService } from "../service/api-key.service.js";
import { contextUtil } from "../../util/context.util.js";

type ApiKeyReq = {
  credential: Credential;
  captchaToken?: string;
}

type Dependencies = {
  httpServer: HttpServer;
  apiKeyService: ApiKeyService;
  config: Config;
  gateService: IGateService
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "apiKeyService",
  "config",
  "gateService"
];

/** Controller for generating API KEYS */
export function apiKeyController(injector: Injector<Dependencies>): void {
  const {
    httpServer: { fastify },
    apiKeyService,
    config,
    gateService: gate
  } = contextUtil.from(tokens, injector);

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
        .validateCaptcha(captchaToken, { action: "auth" })
        .validateCredential(credential, {
          type: "EthereumAccount",
          ttlRange: apiKeysCredentialTTL
        })
        .verifyCredential(credential)
        .openAll((closed) => {
          throw new ClientErr({
            message: closed.reason,
            statusCode: closed.errStatus,
            place: apiKeyController.name,
            description: closed.reason
          });
        });
      req.body.credential = ThrowDecoder.decode(
        Credential,
        credential,
        new ClientErr("Invalid credential")
      );
    },
    handler: async (req) => {
      const credential = req.body.credential as EthAccountVC;
      return await apiKeyService.generate({ credential: credential, });
    }
  });
}
