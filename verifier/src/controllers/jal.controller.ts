import { DI } from "../app.js";
import { Injector } from "typed-inject";
import { JalProgram } from "@jaljs/core";


export function JalController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const jalService = injector.resolve("jalService");

  fastify.post<{ Body: JalProgram }>("/api/v1/jal", async (req, resp) => {
    try {
      const jalProgram = req.body;
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
    if (jalEntity) return {
      id: jalEntity.id,
      program: jalEntity.program
    };
    resp.statusCode === 400;
    return { message: `Can not find JAL by id: ${jalId}` };
  });
}