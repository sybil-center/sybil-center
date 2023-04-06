import createFastify, { type FastifyInstance } from "fastify";
import type { ILogger } from "./logger.js";
import { Disposable, tokens } from "typed-inject";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyStatic from "@fastify/static";
import { ClientError, ServerError } from "./errors.js";
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

  async listen(): Promise<void> {
    // register fastify cors
    this.fastify.register(cors, { origin: "*" });

    // register swagger
    await this.fastify.register(swagger, {
      swagger: {
        info: {
          title: "Verifiable Credential Issuer",
          description: "Verifiable credential issuer api",
          version: "1.0.0",
        },
        host: this.pathToExposeDomain.host,
        schemes: [this.protocol],
      },
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
    await this.fastify.register(fastifyStatic, {
      root: path.join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "public"
      ),
    });

    this.fastify.setErrorHandler<Error>((error, _, reply) => {
      if (error instanceof ClientError) {
        reply.status(error.statusCode).send({ message: error.message });

      } else if (error instanceof ServerError) {
        this.logger.error(`${error._place}: ${error._log}`);
        reply.status(error.statusCode).send({ message: error.message });

      } else {
        this.logger.error(error);
        reply.status(500).send({ message: "Internal server error" });
      }
    });
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
