import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { getIssuerIds, toIssuerToken } from "../util/index.js";
import { IIssuer } from "../types/issuer.js";
import { IssuerException } from "../backbone/errors.js";
import { IEC } from "@zcredjs/core";


export class IssuerSupervisor {

  private readonly issuerMap: Map<string, IIssuer> = new Map([]);

  static inject = tokens(INJECTOR_TOKEN);
  constructor(injector: Injector<Record<string, any>>) {
    for (const id of getIssuerIds()) {
      const issuer = injector.resolve(toIssuerToken(id)) as IIssuer;
      this.issuerMap.set(id, issuer);
    }
  }

  findIssuer(id: string): IIssuer | undefined {
    return this.issuerMap.get(id);
  }

  getIssuer(id: string): IIssuer {
    const issuer = this.findIssuer(id);
    if (issuer) return issuer;
    throw new IssuerException({
      code: IEC.NO_ISSUER,
      msg: `Can not find issuer with id: ${id}`,
      desc: `${this.constructor.name}. Can not find issuer with id: ${id}`
    });
  }
}
