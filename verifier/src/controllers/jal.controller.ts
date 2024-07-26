import { DI } from "../app.js";
import { Injector } from "typed-inject";
import { JalProgram } from "@jaljs/core";
import { SIWX_STATEMENT } from "../consts/index.js";


export function JalController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const jalService = injector.resolve("jalService");
  const siwxService = injector.resolve("siwxService");

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
      programComment: string;
      siwx: {
        message: string;
        signature: string;
      },
    }
  }>("/api/v2/jal", async (req, resp) => {
    try {
      const {
        siwx: {
          message,
          signature
        },
        programComment,
        jalProgram
      } = req.body;
      const { subject } = await siwxService.verify({
        message: message,
        signature: signature
      }, { statement: SIWX_STATEMENT.CREATE_JAL });

      const { id } = await jalService.saveWithComment({
        subject: subject,
        jalProgram: jalProgram,
        comment: programComment
      });
      resp.statusCode = 201;
      return { id };
    } catch (e: any) {
      resp.statusCode = 400;
      return { message: `${e.message}` };
    }

  });
}