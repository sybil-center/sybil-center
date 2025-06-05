import { tokens } from "typed-inject";
import { JalService } from "./jal.service.js";
import { Proposal, ProvingResult } from "../types/index.js";
import { Identifier, VEC } from "@zcredjs/core";
import { IZkProofVerifier } from "../types/zk-proof-verifier.js";
import { O1JSProofVerifier } from "./o1js-proof-verifier.js";
import { VerifierException } from "../backbone/exception.js";
import { verifySignature } from "./signature-verifier.js";

type GetProposal = {
  jalId: string;
  metaIssuer: Proposal["selector"]["meta"]["issuer"],
  subjectId: Identifier
}

type Verify = {
  jalId: string;
  provingResult: ProvingResult;
}

export class ZcredVerifierManager {

  static inject = tokens("jalService");
  constructor(
    private readonly jalService: JalService,
  ) {}

  private readonly zkProofVerifiers: Record<string, Promise<IZkProofVerifier>> = {};

  async getProposal({ jalId, metaIssuer, subjectId }: GetProposal): Promise<Pick<Proposal, "program" | "selector">> {
    const jalEntity = await this.jalService.getById(jalId);
    if (!jalEntity) throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ,
      msg: `ZK proof verifier with id ${jalId} not found`
    });
    const jalProgram = jalEntity.program;
    if (jalProgram.target === "o1js:zk-program.cjs") {
      if (!this.zkProofVerifiers[jalId]) {
        this.zkProofVerifiers[jalId] = O1JSProofVerifier.init(jalProgram);
      }
    } else {
      throw new VerifierException({
        code: VEC.VERIFIER_ERROR,
        msg: `Invalid JAL program target for verifier id: ${jalId}`
      });
    }
    return {
      program: jalProgram,
      selector: {
        attributes: {
          subject: {
            id: subjectId
          }
        },
        meta: {
          issuer: metaIssuer
        }
      }
    };
  }

  async verify({ jalId, provingResult }: Verify): Promise<boolean> {
    const verifierPromise = this.zkProofVerifiers[jalId];
    const subjectId = provingResult.publicInput.credential.attributes.subject.id;
    const isSignatureVerified = await verifySignature({
      message: provingResult.message,
      signature: provingResult.signature,
      subject: { id: subjectId }
    });
    if (!isSignatureVerified) return false;
    if (!verifierPromise) {
      const jalEntity = await this.jalService.getById(jalId);
      if (!jalEntity) throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `ZK proof verifier with id ${jalId} not found`
      });
      const jalProgram = jalEntity.program;
      if (jalProgram.target === "o1js:zk-program.cjs" && !this.zkProofVerifiers[jalId]) {
        this.zkProofVerifiers[jalId] = Promise.resolve(await O1JSProofVerifier.init(jalProgram));
      }
    }
    const verifier: IZkProofVerifier = (await this.zkProofVerifiers[jalId])!;
    return await verifier.verify(provingResult);
  }

  async getO1JSZkProgramMeta(jalId: string) {
    const verifierPromise = this.zkProofVerifiers[jalId];
    if (!verifierPromise) return null;
    const verifier = await verifierPromise;
    if (verifier instanceof O1JSProofVerifier) {
      return {
        zkProgram: verifier.zkProgram,
        PublicInput: verifier.PublicInput,
        verificationKey: verifier.verificationKey
      };
    }
    return null;
  }

}