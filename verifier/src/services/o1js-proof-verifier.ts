import { InputTransformer, JalProgram } from "@jaljs/core";
import { O1TrGraph } from "o1js-trgraph";
import { ProvingResult } from "../types/index.js";
import vm from "node:vm";
import type {
  Bool,
  Field,
  JsonProof,
  PrivateKey,
  Proof,
  PublicKey,
  Signature,
  UInt64,
  VerificationKey
} from "o1js";
import * as o1js from "o1js";
import { ZkProgramTranslator } from "@jaljs/o1js";
import sortKeys from "sort-keys";
import { ID_TYPES, IdType } from "@zcredjs/core";
import { IZkProofVerifier } from "../types/zk-proof-verifier.js";

type O1Type = Field | UInt64 | Signature | PublicKey | Bool | PrivateKey


type ZkProgramType = {
  execute(...args: unknown[]): Promise<Proof<unknown, unknown>>;
  compile(options?: { forceRecompile: boolean }): Promise<{ verificationKey: VerificationKey }>;
  verify(proof: ReturnType<(typeof o1js.Proof<any, any>)["fromJSON"]>): Promise<boolean>
}

interface PublicInput {
  new(args: Record<string, any>): any;
}

export type ProgramInitResult = {
  zkProgram: ZkProgramType,
  PublicInput: PublicInput
}

export class O1JSProofVerifier implements IZkProofVerifier {

  private constructor(
    readonly jalProgram: JalProgram,
    readonly verificationKey: VerificationKey,
    readonly zkProgram: ZkProgramType,
    readonly PublicInput: PublicInput,
    private readonly inputTransformer: InputTransformer,
  ) {
    this.verify = this.verify.bind(this);
    this.toO1JSPublicInput = this.toO1JSPublicInput.bind(this);
  }

  static async init(jalProgram: JalProgram): Promise<O1JSProofVerifier> {
    const module = new vm.Script(translator.translate(jalProgram)).runInThisContext();
    const { zkProgram, PublicInput } = (await module.initialize(o1js) as ProgramInitResult);
    const { verificationKey } = await zkProgram.compile({ forceRecompile: true });
    return new O1JSProofVerifier(
      jalProgram,
      verificationKey,
      zkProgram,
      PublicInput,
      new InputTransformer(jalProgram.inputSchema, trgraph),
    );
  }

  async verify(provingResult: Omit<ProvingResult, "signature">): Promise<boolean> {
    try {
      const jsonProof: JsonProof = {
        publicInput: this.toO1JSPublicInput(provingResult.publicInput),
        publicOutput: [],
        proof: provingResult.proof,
        maxProofsVerified: 0
      };
      return await o1js.verify(jsonProof, this.verificationKey);
    } catch (e) {
      return false;
    }
  }

  private toO1JSPublicInput(publicInput?: ProvingResult["publicInput"]): string[] {
    if (!publicInput) return [];
    const result = this.inputTransformer
      .transformPublicInput<{}, O1Type[]>({ public: sortKeys(publicInput, { deep: true }) })
      .linear
      .flatMap((it) => it.toFields().map((it) => it.toJSON()));
    return result;
  }
}

const translator = new ZkProgramTranslator(o1js, "commonjs");
const trgraph = new O1TrGraph(o1js);


export function isIdType(idtype: string): idtype is IdType {
  //@ts-expect-error
  return ID_TYPES.includes(idtype);
}


