import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
} from "../../../../base/service/credentials.js";
import { IProofService } from "../../../../base/service/proof.service.js";
import { DIDService } from "../../../../base/service/did.service.js";
import { Disposable, tokens } from "typed-inject";
import sortKeys from "sort-keys";
import { CanIssueResp, Challenge, ChallengeReq, Credential, CredentialType, IssueReq } from "@sybil-center/sdk/types";
import { absoluteId } from "../../../../util/id.util.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../base/service/challenge.service.js";
import { TimedCache } from "../../../../base/service/timed-cache.js";
import { IMultiSignService } from "../../../../base/service/multi-sign.service.js";

export type EmptyVC = Credential

function getEmptyVC(issuer: string, subjectDID: string): EmptyVC {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "Empty"],
      credentialSubject: {
        id: subjectDID
      },
      issuer: { id: issuer },
      issuanceDate: new Date(),
    },
    { deep: true }
  );
}

/** Return empty VC */
export class EmptyIssuer
  implements ICredentialIssuer<
    IssueReq,
    Credential,
    ChallengeReq,
    Challenge
  >, Disposable {
  static inject = tokens("proofService", "didService", "config", "multiSignService");

  private readonly sessionCache: TimedCache<string, { issueChallenge: string; }>;

  constructor(
    private readonly proofService: IProofService,
    private readonly didService: DIDService,
    private readonly config: { signatureMessageTTL: number },
    private readonly multiSignService: IMultiSignService
  ) {
    this.sessionCache = new TimedCache(this.config.signatureMessageTTL);
  }

  async getChallenge({ publicId }: ChallengeReq): Promise<Challenge> {
    const sessionId = absoluteId();
    const issueChallenge = toIssueChallenge({ publicId: publicId, type: "Empty" });
    this.sessionCache.set(sessionId, { issueChallenge });
    return {
      sessionId: sessionId,
      issueChallenge: issueChallenge
    };
  }

  async canIssue(): Promise<CanIssueResp> {
    return { canIssue: true };
  }

  async issue({ signature, sessionId, signType }: IssueReq): Promise<Credential> {
    const { issueChallenge } = this.sessionCache.get(sessionId);
    const { publicId } = fromIssueChallenge(issueChallenge);
    const subjectDID = await this.multiSignService
      .signAlg(signType)
      .did(signature, issueChallenge, publicId);
    const emptyVC = getEmptyVC(this.didService.id, subjectDID);
    return await this.proofService.jwsSing(emptyVC);
  }

  get providedCredential(): CredentialType {
    return "Empty";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
