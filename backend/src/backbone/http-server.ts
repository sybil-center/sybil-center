import createFastify, { type FastifyInstance } from "fastify";
import type { ILogger } from "./logger.js";
import { Disposable, tokens } from "typed-inject";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import { ClientErr, ServerErr } from "./errors.js";
import type { Config } from "./config.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

export class HttpServer implements Disposable {
  static inject = tokens("logger", "config");

  readonly fastify: FastifyInstance;

  private readonly protocol: string;
  private readonly host: string;
  private readonly port: number;
  private readonly pathToExposeDomain: URL;

  constructor(private readonly logger: ILogger, config: Config) {
    this.fastify = createFastify({
      logger: logger,
      disableRequestLogging: true,
    });
    this.protocol = config.protocol;
    this.host = config.host;
    this.port = config.port;
    this.pathToExposeDomain = config.pathToExposeDomain;
  }

  async register(): Promise<void> {
    // register fastify cors
    this.fastify.register(cors, { origin: "*" });

    // register swagger
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: "Sybil Center",
          description: "Sybil Center - Verifiable Credential Issuer." +
            "See https://github.com/sybil-center/sybil",
          version: "1.0.0",
        },
        host: this.pathToExposeDomain.host,
        schemes: [this.protocol],
      },
      hideUntagged: true,
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

    // Register fastify-static
    this.fastify.register(fastifyStatic, {
      root: path.join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "public"
      ),
    });
    await this.fastify.register(import("fastify-raw-body"), {
      global: false,
    });
    await this.fastify.setErrorHandler<Error>((error, req, reply) => {
      if (error instanceof ClientErr) {
        this.logger.error(error.info, "Client error information");
        reply
          .status(error.info.statusCode)
          .send({ message: error.info.message });

      } else if (error instanceof ServerErr) {
        this.logger.error(error.info, `Server error information`);
        this.logger.error(req, `Server error request`);
        reply
          .status(error.info.statusCode)
          .send({ message: error.info.message });

      } else {
        this.logger.error(new ClientErr({
          message: error.message,
          cause: error,
          description: `Unexpected error`
        }).info, `Unexpected error`);
        reply.status(400)
          .send({ message: "Bad request or server error" });
      }
    });
  }

  async listen(): Promise<void> {
    await this.fastify.listen({
      port: this.port,
      host: this.host,
    });
  }

  async dispose() {
    this.logger.info("Closing server...");
    await this.fastify.close();
  }
}
