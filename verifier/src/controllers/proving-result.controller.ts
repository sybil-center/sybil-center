import { Injector } from "typed-inject";
import { DI } from "../app.js";

export function ProvingResultController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const provingResultService = injector.resolve("provingResultService");
  const config = injector.resolve("config");

  fastify.get<{
    Params: { id: string }
  }>("/api/v1/proving-result/:id", async (req, resp) => {
    const id = req.params.id;
    if (!id) {
      resp.statusCode === 400;
      return { message: "proving-result id is not defined" };
    }
    const entity = await provingResultService.getById(id);
    if (entity) return {
      id: entity.id,
      provingResult: entity.result,
      jalId: entity.jalId,
      jalURL: new URL(`./api/v1/jal/${entity.jalId}`, config.exposeDomain)
    };
    resp.statusCode === 400;
    return { message: `proving-result with id ${id} not found` };
  });
}