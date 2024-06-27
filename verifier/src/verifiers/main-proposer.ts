import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";
import { getVerifiersIds, toProposerToken } from "../services/verifiers-initialize.js";
import { IProposer } from "../types/verifiers.type.js";
import { VerifierException } from "../backbone/exception.js";
import { VEC } from "@zcredjs/core";

export class MainProposer {

  private readonly proposerMap = new Map<string, IProposer>([]);

  static inject = tokens(INJECTOR_TOKEN);
  constructor(injector: Injector<Record<string, any>>) {
    for (const id of getVerifiersIds()) {
      const token = toProposerToken(id);
      const accessGetter = injector.resolve(token);
      if (!accessGetter) {
        throw new Error(`Issuer access getter with id ${id} not found in context`);
      }
      this.proposerMap.set(id, accessGetter);
    }
  }

  findProposer(id: string): IProposer | null {
    const proposer = this.proposerMap.get(id);
    return proposer ? proposer : null;
  }

  getProposer(id: string): IProposer {
    const proposer = this.findProposer(id);
    if (proposer) return proposer;
    throw new VerifierException({
      code: VEC.PROPOSAL_BAD_REQ,
      msg: `Can not create proposal`
    });
  }

}