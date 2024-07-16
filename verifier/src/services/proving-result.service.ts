import { ProvingResultStore } from "../stores/proving-result.store.js";
import { tokens } from "typed-inject";
import { ProvingResult } from "../types/index.js";


export class ProvingResultService {

  static inject = tokens("provingResultStore");
  constructor(
    private readonly provingResultStore: ProvingResultStore
  ) {}

  async save({ provingResult, jalId }: { provingResult: ProvingResult, jalId: string }) {
    return await this.provingResultStore.save({ provingResult, jalId });
  }

  async getById(id: string) {
    return await this.provingResultStore.getById(id);
  }
}