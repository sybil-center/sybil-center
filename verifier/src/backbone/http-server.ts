import { Config } from "./config.js";
import createFastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { VerifierException } from "./exception.js";
import fastifyStatic from "@fastify/static";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { Disposable, tokens } from "typed-inject";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import crypto from "node:crypto";

export class HttpServer implements Disposable {

  readonly fastify: FastifyInstance;

  static inject = tokens("config");
  constructor(private readonly config: Config) {
    this.fastify = createFastify({
      disableRequestLogging: true
    });
  }

  async register(): Promise<void> {
    // register fastify cors
    this.fastify.register(cors, { origin: "*" });
    // register swagger
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: "ZCred Verifier",
          description: "ZCred verifier",
          version: "1.0.0",
        },
        host: this.config.exposeDomain.host,
        schemes: [this.config.protocol],
      },
      hideUntagged: true
    });
    // register swagger ui
    await this.fastify.register(swaggerUi, {
      routePrefix: "/documentation",
      uiConfig: {
        docExpansion: "full",
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
    });

    this.fastify.register(fastifyStatic, {
      root: path.join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "public"
      ),
    });

    await this.fastify.register(cookie);
    await this.fastify.register(jwt, {
      secret: crypto.createHmac(
        "sha256",
        `http-server:${this.config.secret}:jwt-key`
      ).update(this.config.secret)
        .digest("hex")
    });

    this.fastify.setErrorHandler<Error>((e, _, resp) => {
      if (e instanceof VerifierException) {
        resp.status(400);
        return { code: e.code, message: e.msg };
      } else {
        resp.status(500);
        return { message: e.message };
      }
    });
  }

  async listen(): Promise<void> {
    console.log(`Start http server on ${this.config.host}:${this.config.port}`);
    await this.fastify.listen({
      port: this.config.port,
      host: this.config.host,
    });
  }

  async dispose() {
    await this.fastify.close();
  }
}