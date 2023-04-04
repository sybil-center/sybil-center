import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
} from "../../../../base/credentials.js";
import { IProofService } from "../../../../base/service/proof-service.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { tokens } from "typed-inject";
import sortKeys from "sort-keys";
import { Challenge, ChallengeReq, Credential, IssueReq, CanIssueResp, CredentialType} from "@sybil-center/sdk/types";
import { absoluteId } from "../../../../util/id-util.js";

export type EmptyVC = Credential

export function getEmptyVC(issuer: string, vcRequest: IssueReq): EmptyVC {
  // @ts-ignore
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "Empty"],
      issuer: issuer,
      issuanceDate: new Date(),
    },
    { deep: true }
  );
}

/**
 * Return empty VC
 */
export class EmptyIssuer
  implements ICredentialIssuer<IssueReq, Credential, ChallengeReq, Challenge> {
  static inject = tokens("proofService", "didService");

  constructor(
    private readonly proofService: IProofService,
    private readonly didService: DIDService
  ) {}

  async getChallenge(): Promise<Challenge> {
    return {
      sessionId: absoluteId(),
      issueChallenge: `Sign to issue ${this.providedCredential} credential`
    };
  }

  async canIssue(): Promise<CanIssueResp> {
    return { canIssue: true };
  }

  async issue(vcRequest: IssueReq): Promise<Credential> {
    const emptyVC = getEmptyVC(this.didService.id, vcRequest);
    return await this.proofService.jwsSing(emptyVC);
  }

  get providedCredential(): CredentialType {
    return "Empty";
  }
}
