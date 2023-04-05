import type { Issuer } from "../../base/issuer.type.js";
import { EthAccountProvider } from "./provider.js";
import { HttpClient } from "../../base/http-client.js";
import type { SubjectProof } from "../../types/index.js";
import { EthAccountOptions, EthAccountVC } from "./types.js";

export class EthAccountIssuer
  implements Issuer<EthAccountVC, EthAccountOptions> {

  private readonly provider: EthAccountProvider;

  constructor(backend: HttpClient) {
    this.provider = new EthAccountProvider(backend);
  }

  async issueCredential(
    { publicId, signFn }: SubjectProof,
    opt?: EthAccountOptions
  ): Promise<EthAccountVC> {
    const challenge = await this.provider.getChallenge({
      custom: opt?.custom,
      expirationDate: opt?.expirationDate,
      publicId: publicId,
      ethAddress: opt?.ethOwnerProof?.publicId
    });
    if (opt?.ethOwnerProof) {
      await this.provider.ownerProof(opt.ethOwnerProof.signFn, challenge);
    }
    return await this.provider.issueVC(signFn, {
      sessionId: challenge.sessionId,
      issueChallenge: challenge.issueChallenge
    });
  }
}
