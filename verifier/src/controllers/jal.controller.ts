import { DI } from "../app.js";
import { Injector } from "typed-inject";
import { JalProgram } from "@jaljs/core";
import { SIWE_STATEMENT } from "../consts/index.js";


export function JalController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const jalService = injector.resolve("jalService");
  const siweService = injector.resolve("siweService");

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

  fastify.get<{
    Params: { id: string }
  }>("/api/v1/jal/:id", async (req, resp) => {
    const jalId = req.params.id;
    const jalEntity = await jalService.getById(jalId);
    if (jalEntity) {
      return {
        id: jalEntity.id,
        program: jalEntity.program
      };
    }
    resp.statusCode === 400;
    return { message: `Can not find JAL by id: ${jalId}` };
  });

  /** Create JAL program with comment defined by client*/
  fastify.post<{
    Body: {
      jalProgram: JalProgram;
      comment: string;
      siwe: {
        message: string;
        signature: string;
      },
    }
  }>("/api/v2/jal", async (req, resp) => {
    try {
      const {
        siwe: {
          message,
          signature
        },
        comment,
        jalProgram
      } = req.body;
      const { subject } = await siweService.verify({
        message: message,
        signature: signature
      }, { statement: SIWE_STATEMENT.CREATE_JAL });

      const { id } = await jalService.saveWithComment({
        subject: subject,
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