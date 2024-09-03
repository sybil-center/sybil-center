import { VerificationResultStore } from "../stores/verification-result.store.js";
import { ZcredVerifierManager } from "./zcred-verifier-manager.js";
import { tokens } from "typed-inject";
import { ProvingResult } from "../types/index.js";
import {
  VerificationResultEntity,
  VerificationResultEntityNew
} from "../models/entities/verification-result.entity.js";

export class VerificationResultService {

  static inject = tokens(
    "verificationResultStore",
    "zcredVerifierManager"
  );
  constructor(
    private readonly verificationResultStore: VerificationResultStore,
    private readonly zcredVerifierManager: ZcredVerifierManager
  ) {

  }

  async verifyProvingResult(input: {
    jalId: string;
    provingResult: ProvingResult
  }): Promise<boolean> {
    const { jalId, provingResult } = input;
    return await this.zcredVerifierManager.verify({
      jalId: jalId,
      provingResult: provingResult
    });
  }

  async save(entity: VerificationResultEntityNew): Promise<{ id: string }> {
    return await this.verificationResultStore.save(entity);
  }

  async getVerificationResultById(id: string): Promise<VerificationResultEntity | undefined> {
    return await this.verificationResultStore.getById(id);
  }
}