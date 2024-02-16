import { VerifyResult, Credential } from "@sybil-center/sdk/types";
import { DIDService } from "../did.service.js";
import { tokens } from "typed-inject";
import { VCSignatureProver } from "./vc-signature-prover.js";

/** Verify credential issued by our issuer */
export class VCCredentialVerifier {

  static inject = tokens(
    "didService",
    "vcSignatureProver"
  );
  constructor(
    private readonly didService: DIDService,
    private readonly vcSignatureProver: VCSignatureProver,
  ) {}

  async verify(credential: Credential): Promise<VerifyResult> {
    if (credential.issuer.id !== this.didService.id) return { isVerified: false };
    const isExpired = credential.expirationDate
      ? (new Date().getTime() >= credential.expirationDate.getTime())
      : false;
    if (isExpired) return { isVerified: false };
    const isProofVerified = await this.vcSignatureProver.verify(credential);
    return { isVerified: isProofVerified };
  }
}

