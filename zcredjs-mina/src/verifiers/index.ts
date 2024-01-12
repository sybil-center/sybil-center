import { ICredentialVerifier, ProofType, ZkCredential } from "@zcredjs/core";
import { MinaPoseidonPastaVerifier } from "./poseidon-pasta.js";
import { MinaACIPoseidonVerifier } from "./aci-poseidon.js";

export type MinaProofType = Extract<ProofType, "mina:poseidon-pasta" | "aci:mina-poseidon">

const PROOFTYPE_VERIFIER: Record<MinaProofType, () => ICredentialVerifier> = {
  "mina:poseidon-pasta": MinaPoseidonPastaVerifier.init,
  "aci:mina-poseidon": MinaACIPoseidonVerifier.init,
};

export class MinaCredentialVerifier
  implements Omit<ICredentialVerifier, "proofType"> {

  private readonly verifier: ICredentialVerifier;
  constructor(proofType: MinaProofType) {
    if (PROOFTYPE_VERIFIER[proofType]) {
      this.verifier = PROOFTYPE_VERIFIER[proofType]();
    } else {
      throw new Error(`Can not create mina verifier from proof type ${proofType}`);
    }
  }

  verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, reference?: string): Promise<boolean> {
    return this.verifier.verify(cred, reference);
  }
}