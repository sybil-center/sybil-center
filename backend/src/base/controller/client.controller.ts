import { Injector } from "typed-inject";
import { HttpServer } from "../../backbone/http-server.js";
import { toContext } from "../../util/context.util.js";
import { Config } from "../../backbone/config.js";
import {
  clientIsLoggedInRoute,
  clientLoginRoute,
  clientLogoutRoute,
  selfClientFindRoute,
  selfClientUpdateRoute
} from "./routes/client.route.js";
import { Credential } from "../types/credential.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { ClientError } from "../../backbone/errors.js";
import { AccountJWT, type IJwtService } from "../service/jwt.service.js";
import { type EthAccountVC } from "@sybil-center/sdk";
import { credentialUtil } from "../../util/credential.utils.js";
import { type IClientService } from "../service/client.service.js";
import { ILogger } from "../../backbone/logger.js";
import { encode } from "../../util/encoding.util.js";
import { ClientUpdate } from "../storage/client.repo.js";

type Dependencies = {
  httpServer: HttpServer;
  config: Config;
  jwtService: IJwtService;
  clientService: IClientService,
  logger: ILogger
}

const tokens: (keyof Dependencies)[] = [
  "httpServer",
  "config",
  "jwtService",
  "clientService",
  "logger"
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
  } = toContext(tokens, injector);

  const validateCustomSchemas = (schemas: ClientUpdate["customSchemas"]): void => {
    schemas?.forEach((schema) => {
      const schemaSize = new Uint8Array(Buffer.from(JSON.stringify(schema))).length;
      const schemaOutOfLimit = schemaSize > config.customSchemaSizeLimit;
      if (schemaOutOfLimit) {
        throw new ClientError(`Custom schema size out of limit`);
      }
    });
  };

  fastify.route<{ Body: LoginReq }>({
    ...clientLoginRoute,
    preHandler: async (req) => {
      const credential = req.body.credential;
      req.body.credential = ThrowDecoder
        .decode(Credential, credential, new ClientError("Invalid credential"));
    },
    handler: async (req, resp) => {
      const credential = req.body.credential as EthAccountVC;
      const captchaToken = req.body.captchaToken; // CAPTCHA action has to be "login"
      if (config.captchaRequired && !captchaToken) {
        throw new ClientError("CAPTCHA token required");
      }
      const token = await jwtService.toAccountJWT({ credential, captchaToken });
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
    ...selfClientUpdateRoute,
    preHandler: async ({ body: { client, requirements } }) => {
      validateCustomSchemas(client.customSchemas);
      requirements.credential = ThrowDecoder.decode(
        Credential, requirements.credential,
        new ClientError("Invalid credential")
      );
    },
    handler: async ({ cookies, body: { client, requirements } }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      await clientService.update({ accountId }, client, requirements);
      return {
        status: "ok",
      };
    }
  });

  fastify.route({
    ...selfClientFindRoute,
    handler: async ({ cookies }) => {
      const jwt = cookies[clientCookie];
      if (!jwt) throw new ClientError(`Login first`, 403);
      const { accountId } = jwtService.verifyToken<AccountJWT>(jwt);
      return await clientService.get({ accountId: accountId });
    }
  });
}
