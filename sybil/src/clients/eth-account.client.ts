import type { IClient } from "./client.type.js";
import { EthAccountProvider } from "../providers/eth-account.provider.js";
import { HttpClient } from "../util/http-client.js";
import type { SignFn } from "../types/index.js";
import { EthAccountOptions, EthAccountVC } from "../types/index.js";

export class EthAccountClient implements IClient<EthAccountVC, EthAccountOptions> {
  private readonly provider: EthAccountProvider;

  constructor(backend: HttpClient) {
    this.provider = new EthAccountProvider(backend);
  }

  async issueCredential(
    signFn: SignFn,
    opt?: EthAccountOptions
  ): Promise<EthAccountVC> {
    const challenge = await this.provider.getPayload({
      custom: opt?.custom
    });
    if (opt?.ownerProofFn) {
      await this.provider.ownerProof(opt.ownerProofFn, challenge);
    }
    return await this.provider.issueVC(signFn, {
      sessionId: challenge.sessionId,
      issueChallenge: challenge.issueChallenge
    });
  }
}
