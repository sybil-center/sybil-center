import type { DIDService } from "./did.service.js";
import { tokens } from "typed-inject";
import { Credential } from "@sybil-center/sdk/types"

export interface IProofService {
  jwsSing(vc: Credential): Promise<Credential>;
}

/**
 * Service for Sign VCs
 */
export class ProofService implements IProofService {
  static inject = tokens("didService");

  constructor(private readonly didService: DIDService) {}

  /**
   * Sign VC by JWS
   * @see https://www.w3.org/TR/vc-jws-2020/#ref-for-dfn-jsonwebsignature2020-3
   * @param vc
   */
  async jwsSing(vc: Credential): Promise<Credential> {
    const dagJWS = await this.didService.createJWS(vc);
    const [jwsSignature] = dagJWS.signatures;
    //convert to detached JWS
    const jws = jwsSignature?.protected + ".." + jwsSignature?.signature;

    vc.proof = {
      type: "JsonWebSignature2020",
      created: new Date(),
      proofPurpose: "assertionMethod",
      verificationMethod: this.didService.verificationMethod,
      jws: jws,
    };
    return vc;
  }
}
