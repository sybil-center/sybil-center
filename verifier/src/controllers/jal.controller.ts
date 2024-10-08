import { DI } from "../app.js";
import { Injector } from "typed-inject";
import { JalProgram } from "@jaljs/core";
import { VERIFIER_STATEMENT } from "../consts/index.js";
import { Static, Type } from "@sinclair/typebox";
import { extractBearerToken, jwkToZcredId } from "../util/index.js";

const JalIdParam = Type.Object({
  id: Type.String()
});

export type JalIdParam = Static<typeof JalIdParam>;

const CreateClientJalProgram = Type.Object({
  jalProgram: Type.Record(Type.String(), Type.Any()),
  comment: Type.String(),
});

export type CreateClientJalProgram = Omit<Static<typeof CreateClientJalProgram>, "jalProgram"> & {
  jalProgram: JalProgram
}

export function JalController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const jalService = injector.resolve("jalService");
  const jwsVerifierService = injector.resolve("jwsVerifierService");

  fastify.post<{ Body: JalProgram }>("/api/v1/jal", async (req, resp) => {
    try {
      const jalProgram = req.body;
      resp.statusCode = 201;
      return await jalService.save(jalProgram);
    } catch (e: any) {
      resp.statusCode = 400;
      return { message: e.message };
    }
  });

  fastify.get<{ Params: JalIdParam }>("/api/v1/jal/:id", {
    schema: { params: JalIdParam }
  }, async (req, resp) => {
    const jalId = req.params.id;
    const jalEntity = await jalService.getById(jalId);
    if (jalEntity) {
      return {
        id: jalEntity.id,
        program: jalEntity.program
      };
    }
    resp.statusCode = 400;
    return { message: `Can not find JAL by id: ${jalId}` };
  });

  /** Create JAL program with comment defined by client*/
  fastify.post<{ Body: CreateClientJalProgram }>("/api/v2/jal", {
    schema: { body: CreateClientJalProgram }
  }, async (req, resp) => {
    if (!req.headers.authorization) {
      resp.statusCode = 401;
      return { message: `Authorization header is not specified as 'Bearer <jws>'` };
    }
    const jws = extractBearerToken(req.headers.authorization);
    const { jwk } = await jwsVerifierService.verifyJWS(jws, {
      statement: VERIFIER_STATEMENT.CREATE_JAL
    });
    try {
      const {
        comment,
        jalProgram
      } = req.body;

      const clientId = jwkToZcredId(jwk);
      const { id } = await jalService.saveWithComment({
        client: { id: clientId },
        jalProgram: jalProgram,
        comment: comment
      });
      resp.statusCode = 201;
      return { id };
    } catch (e: any) {
      resp.statusCode = 400;
      return { message: `${e.message}` };
    }

  });
}