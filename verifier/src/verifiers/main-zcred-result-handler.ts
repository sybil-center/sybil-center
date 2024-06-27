import { IZcredResultHandler } from "../types/verifiers.type.js";
import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { getVerifiersIds, toResultHandlerToken } from "../services/verifiers-initialize.js";
import { VerifierException } from "../backbone/exception.js";
import { VEC } from "@zcredjs/core";

export class MainZcredResultHandler {

  private readonly resultHandlerMap = new Map<string, IZcredResultHandler>([]);

  static inject = tokens(INJECTOR_TOKEN);
  constructor(
    injector: Injector<Record<string, any>>
  ) {
    for (const id of getVerifiersIds()) {
      const token = toResultHandlerToken(id);
      const resultHandler = injector.resolve(token);
      if (!resultHandler) {
        throw new Error(`Zcred result handler with id ${id} not found in context`);
      }
      this.resultHandlerMap.set(id, resultHandler);
    }
  }

  findResultHandler(id: string): IZcredResultHandler | null {
    const handler = this.resultHandlerMap.get(id);
    return handler ? handler : null;
  }

  getResultHandler(id: string): IZcredResultHandler {
    const handler = this.findResultHandler(id);
    if (handler) return handler;
    throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ,
      msg: `Result handler not found`
    });
  }
}