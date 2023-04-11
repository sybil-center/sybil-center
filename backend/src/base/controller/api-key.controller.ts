import { FastifyInstance } from "fastify";
import { ApiKeyService } from "../service/api-key.service.js";
import { Credential } from "../types/credential.js";
import { generateAPIkeysRoute } from "./routes/api-key.route.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientError } from "../../backbone/errors.js";
import { EthAccountVC } from "@sybil-center/sdk";

export function apiKeyController(
  fastify: FastifyInstance,
  apiKeyService: ApiKeyService
): FastifyInstance {

  fastify.route<{ Body: Credential }>({
    method: generateAPIkeysRoute.method,
    url: generateAPIkeysRoute.url,
    schema: generateAPIkeysRoute.schema,
    preHandler: async (req) => {
      const credential = req.body;
      req.body = ThrowDecoder
        .decode(Credential, credential, new ClientError("Invalid credential"));
      if (credential.type[1] !== "EthereumAccount") {
        throw new ClientError(`Credential must have 'EthereumAccount' type`)
      }
    },
    handler: async (req) => {
      const credential = req.body as EthAccountVC;
      return await apiKeyService.generate(credential);
    }
  });

  return fastify;
}
