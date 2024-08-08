import { VerificationResultStore } from "../stores/verification-result.store.js";
import { tokens } from "typed-inject";
import { VerificationResultEntity, VerificationResultEntityNew } from "../entities/verification-result.entity.js";
import { isJsonZcredException, JsonZcredException, VEC } from "@zcredjs/core";
import { VerifierManager } from "./verifier-manager.js";
import { verifySignature } from "./signature-verifier.js";


type VerifyResult = {
  result: Required<VerificationResultEntityNew["data"]>["exception"] | Required<VerificationResultEntity["data"]>["provingResult"];
  jalId: string;
}

export class VerificationService {

  static inject = tokens(
    "verificationResultStore",
    "verifierManager"
  );
  constructor(
    private readonly verificationResultStore: VerificationResultStore,
    private readonly verifierManager: VerifierManager
  ) {}

  async verifyResult({
    result,
    jalId,
  }: VerifyResult): Promise<{
    ok: boolean;
    msg?: string;
    zcredCode?: JsonZcredException["code"]
  }> {
    if (isJsonZcredException(result)) {
      return { ok: false, msg: result.message, zcredCode: result.code };
    } else {
      const isSignatureVerified = await verifySignature({
        message: result.message,
        signature: result.signature,
        subject: {
          id: result.publicInput?.credential!.attributes.subject.id
        }
      });
      if (!isSignatureVerified) return {
        ok: false,
        zcredCode: VEC.VERIFY_INVALID_SIGNATURE,
        msg: `Invalid signature`
      };
      const isZkProofVerified = await this.verifierManager.verify({
        jalId: jalId,
        provingResult: result
      });
      if (!isZkProofVerified) return {
        ok: false,
        zcredCode: VEC.VERIFY_INVALID_PROOF,
        msg: `Invalid zk-proof`
      };
      return { ok: true };
    }
  }

  async save(entity: VerificationResultEntityNew) {
    return await this.verificationResultStore.save(entity);
  }

  async verifyAndSave(entity: VerificationResultEntityNew): Promise<{
    ok: boolean;
    id?: string;
    zcredCode?: JsonZcredException["code"];
    msg?: string;
  }> {
    const {
      data: {
        provingResult,
        exception,
      },
      jalId
    } = entity;
    if (exception) {
      return await this.verifyResult({ result: exception, jalId });
    } else if (provingResult) {
      const verifyResult = await this.verifyResult({ result: provingResult, jalId });
      if (!verifyResult.ok) {
        return verifyResult;
      }
      const { id } = await this.save(entity);
      return { ok: true, id: id };
    }
    throw new Error(`Invalid verification result input`);
  }

  async getVerificationResultById(id: string): Promise<VerificationResultEntity | undefined> {
    return await this.verificationResultStore.getById(id);
  }

  async findVerificationResultById(id: string): Promise<VerificationResultEntity> {
    return await this.verificationResultStore.findById(id);
  }
}
