import type { VC } from "../credentials.js";
import { ProofType } from "@sybil-center/sdk";
import type { DIDService } from "./did-service.js";
import { tokens } from "typed-inject";

export interface IProofService {
  jwsSing(vc: VC): Promise<VC>;
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
  async jwsSing(vc: VC): Promise<VC> {
    const dagJWS = await this.didService.createJWS(vc);
    const [jwsSignature] = dagJWS.signatures;
    //convert to detached JWS
    const jws = jwsSignature?.protected + ".." + jwsSignature?.signature;

    vc.proof = {
      type: ProofType.JsonWebSignature2020,
      created: new Date().toISOString(),
      proofPurpose: "assertionMethod",
      verificationMethod: this.didService.verificationMethod,
      jws: jws,
    };
    return vc;
  }
}
