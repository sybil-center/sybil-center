import type {
  ICredentialIssuer,
  CanIssueRes,
  VC,
} from "../../../../base/credentials.js";
import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
} from "../../../../base/credentials.js";
import { IProofService } from "../../../../base/service/proof-service.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { tokens } from "typed-inject";
import sortKeys from "sort-keys";

export interface EmptyVC extends VC {}

/**
 * Request interface for generate empty VC
 */
export interface EmptyVCRequest {
  /**
   * Entity with executing request defined id of vc
   */
  vcId: string;
}

export function getEmptyVC(issuer: string, vcRequest: EmptyVCRequest): EmptyVC {
  // @ts-ignore
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.Empty],
      issuer: issuer,
      id: vcRequest.vcId,
      issuanceDate: new Date(),
    },
    { deep: true }
  );
}

/**
 * Return empty VC
 */
export class EmptyIssuer
  implements ICredentialIssuer<EmptyVCRequest, VC, void, {}, void, CanIssueRes>
{
  static inject = tokens("proofService", "didService");

  constructor(
    private readonly proofService: IProofService,
    private readonly didService: DIDService
  ) {}

  async getChallenge(): Promise<{}> {
    return {};
  }

  async canIssue(): Promise<CanIssueRes> {
    return { canIssue: true };
  }

  async issue(vcRequest: EmptyVCRequest): Promise<VC> {
    const emptyVC = getEmptyVC(this.didService.id, vcRequest);
    return await this.proofService.jwsSing(emptyVC);
  }

  getProvidedVC(): VCType {
    return VCType.Empty;
  }
}
