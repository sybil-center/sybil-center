import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { getIssuerIds, toHttpIssuerControllerToken } from "../util/index.js";
import { IHttpIssuerController } from "../types/issuer.js";
import { IssuerException } from "../backbone/errors.js";
import { IEC } from "@zcredjs/core";

export class HttpIssuerControllerSupervisor {

  private readonly controllerMap = new Map<string, IHttpIssuerController>([]);

  static inject = tokens(INJECTOR_TOKEN);
  constructor(injector: Injector<Record<string, any>>) {
    for (const id of getIssuerIds()) {
      const controller: IHttpIssuerController = injector.resolve(toHttpIssuerControllerToken(id));
      this.controllerMap.set(id, controller);
    }
  }

  findController(id: string): IHttpIssuerController | undefined {
    return this.controllerMap.get(id);
  }

  getController(id: string): IHttpIssuerController {
    const controller = this.findController(id);
    if (controller) return controller;
    throw new IssuerException({
      code: IEC.NO_ISSUER,
      msg: `Can not find http issuer controller with id: ${id}`,
      desc: `${this.constructor.name}. Can not find http issuer controller with id: ${id}`
    });
  }
}
