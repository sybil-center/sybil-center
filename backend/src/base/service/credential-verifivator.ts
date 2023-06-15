import { VerifyResult, Credential } from "@sybil-center/sdk/types";
import { DIDService } from "./did.service.js";
import { tokens } from "typed-inject";
import { ProofService } from "./proof.service.js";

/** Verify credential issued by our issuer */
export class CredentialVerifier {

  static inject = tokens(
    "didService",
    "proofService"
  );
  constructor(
    private readonly didService: DIDService,
    private readonly proofService: ProofService,
  ) {}

  async verify(credential: Credential): Promise<VerifyResult> {
    if (credential.issuer.id !== this.didService.id) return {
      isVerified: false,
    };
    const isExpired = credential.expirationDate
      ? (new Date().getTime() >= credential.expirationDate.getTime())
      : false;
    if (isExpired) return { isVerified: false };
    const isProofVerified = await this.proofService.verify(credential);
    return { isVerified: isProofVerified };
  }
}

