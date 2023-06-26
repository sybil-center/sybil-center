import { Injector } from "typed-inject";
import { HttpServer } from "../../backbone/http-server.js";
import { toContext } from "../../util/context.util.js";
import { Config } from "../../backbone/config.js";
import {
  clientIsLoggedInRoute,
  clientLoginRoute,
  clientLogoutRoute,
  findSelfClientRoute,
  getSelfClientApikeysRoute,
  updateSelfClientApikeysRoute,
  updateSelfClientRoute
} from "./routes/client.route.js";
import { Credential } from "../types/credential.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientError } from "../../backbone/errors.js";
import { AccountJWT, type IJwtService } from "../service/jwt.service.js";
import { credentialUtil } from "../../util/credential.utils.js";
import { type IClientService } from "../service/client.service.js";
import { ILogger } from "../../backbone/logger.js";
import { encode } from "../../util/encoding.util.js";
import { ClientUpdate } from "../storage/client.repo.js";
import { ApikeyService, ApikeysUpdate } from "../service/apikey.service.js";
import { IGateService, OpenResult } from "../service/gate.service.js";

type Dependencies = {
  httpServer: HttpServer;
  config: Config;
  jwtService: IJwtService;
  clientService: IClientService,
  apikeyService: ApikeyService
  logger: ILogger,
  gateService: IGateService
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "config",
  "jwtService",
  "clientService",
  "apikeyService",
  "logger",
  "gateService"
];

type LoginReq = {
  credential: Credential;
  captchaToken?: string;
}

type UpdateSelf = {
  requirements: {
    credential: Credential;
    captchaToken?: string;
  }
  client: ClientUpdate
}

const clientCookie = "sybil-client";
const accountCookie = "sybil-account";


export function clientController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    config,
    jwtService,
    clientService,
    apikeyService,
    gateService: gate
  } = toContext(tokens, injector);

  async function validateCustomSchemas(schemas: ClientUpdate["customSchemas"]): Promise<OpenResult> {
    if (!schemas) return { opened: true, reason: "" };
    for (const schema of schemas) {
      const schemaSize = new Uint8Array(Buffer.from(JSON.stringify(schema))).length;
      const schemaOutOfLimit = schemaSize > config.customSchemaSizeLimit;
      if (schemaOutOfLimit) return {
        opened: false,
        reason: `Custom schema size out of limit`,
        errStatus: 400
      };
    }
    return { opened: true, reason: "" };
  }

  fastify.route<{ Body: LoginReq }>({
    ...clientLoginRoute,
    preHandler: async (req) => {
      const { captchaToken, credential } = req.body;
      await gate.build()
        .captchaRequired(captchaToken)
        .validateCaptcha(captchaToken, { action: "login" })
        .validateCredential(credential, {
          type: "EthereumAccount",
          ttlRange: config.apiKeysCredentialTTL
        })
        .verifyCredential(credential)
        .open((closed) => {
          throw new ClientError(closed.reason, closed.errStatus);
        });
      req.body.credential = ThrowDecoder
        .decode(Credential, credential, new ClientError("Invalid credential"));
    },
    handler: async (req, resp) => {
      const credential = req.body.credential;
      const token = await jwtService.toAccountJWT(credential);
      const accountId = credentialUtil.extractAccountId(credential);
      await clientService.findOrCreate({ accountId: accountId });
      resp.setCookie(clientCookie, token, {
        sameSite: "strict",
        httpOnly: true,
        domain: config.frontendOrigin.href
      });
      resp.setCookie(accountCookie, encode.from(accountId, "utf8").to("base64url"), {
        sameSite: "strict",
        domain: config.frontendOrigin.href
      });
      resp.send({ status: "ok" });
    }
  });

  fastify.route({
    ...clientIsLoggedInRoute,
    handler: async ({ cookies }, resp) => {
      const jwt = cookies[clientCookie];
      if (!jwt) return { isLoggedIn: false };
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      resp.setCookie(accountCookie, encode.from(accountId).to("base64url"), {
        sameSite: "strict",
        domain: config.frontendOrigin.href
      });
      return { isLoggedIn: true };
    }
  });

  fastify.route({
    ...clientLogoutRoute,
    handler: async (_, resp) => {
      resp.clearCookie(clientCookie, { maxAge: 0 });
      resp.clearCookie(accountCookie, { maxAge: 0 });
      resp.send({ status: "ok" });
    }
  });

  fastify.route<{ Body: UpdateSelf }>({
    ...updateSelfClientRoute,
    preHandler: async (req) => {
      const { requirements } = req.body;
      const { captchaToken, credential } = requirements;
      const schemas = req.body.client.customSchemas;
      await gate.build()
        .checkFrontend(req)
        .setLock(async () => validateCustomSchemas(schemas))
        .captchaRequired(captchaToken)
        .validateCaptcha(captchaToken, { action: "update" })
        .validateCredential(credential, {
          type: "EthereumAccount",
          ttlRange: config.apiKeysCredentialTTL
        })
        .verifyCredential(credential)
        .open((closed) => {
          throw new ClientError(closed.reason, closed.errStatus);
        });
      requirements.credential = ThrowDecoder.decode(
        Credential, credential,
        new ClientError("Invalid credential")
      );
    },
    handler: async ({ cookies, body: { client } }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      await clientService.update({ accountId }, client);
      return {
        status: "ok",
      };
    }
  });

  fastify.route({
    ...findSelfClientRoute,
    preHandler: async (req) => {
      await gate.build()
        .checkFrontend(req)
        .open((closed) => {
          throw new ClientError(closed.reason, closed.errStatus);
        });
    },
    handler: async ({ cookies }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      return await clientService.get({ accountId: accountId });
    }
  });

  fastify.route({
    ...getSelfClientApikeysRoute,
    preHandler: async (req) => {
      await gate.build()
        .checkFrontend(req)
        .open((closed) => {
          throw new ClientError(closed.reason, closed.errStatus);
        });
    },
    handler: async ({ cookies }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      return await apikeyService.findOrCreate({ accountId });
    }
  });

  fastify.route <{
    Body: {
      requirements: {
        credential: Credential,
        captchaToken?: string,
      },
      apikeys: ApikeysUpdate
    }
  }>({
    ...updateSelfClientApikeysRoute,
    preHandler: async (req) => {
      const { credential, captchaToken } = req.body.requirements;
      await gate.build()
        .captchaRequired(captchaToken)
        .validateCaptcha(captchaToken, { action: "login" })
        .validateCredential(credential, {
          type: "EthereumAccount",
          ttlRange: config.apiKeysCredentialTTL
        })
        .verifyCredential(credential)
        .open((closed) => {
          throw new ClientError(closed.reason, closed.errStatus);
        });
      const requirements = req.body.requirements;
      requirements.credential = ThrowDecoder.decode(
        Credential, requirements.credential, new ClientError("Invalid credential")
      );
    },
    handler: async ({ cookies, body: { apikeys } }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      await apikeyService.update({ accountId }, apikeys);
      return { status: "ok" };
    }
  });
}
