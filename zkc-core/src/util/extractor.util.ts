import { Proved, ZkcProof, ZkCred } from "../type/index.js";

type ProofOpt = {
  id?: string; // more important than "position"
  position?: number;
}


export class CredExtractor<TCred extends Proved<ZkCred> = Proved<ZkCred>> {
  private readonly credential: Omit<TCred, "proof">;
  private readonly proofs: ZkcProof[];

  /** Create extractor from Proved ZKC */
  constructor(cred: TCred) {
    const copy = JSON.parse(JSON.stringify(cred)) as TCred;
    this.proofs = [...copy.proof];
    // @ts-ignore
    copy.proof = undefined;
    this.credential = copy;
  }

  /**
   * Returns proof.
   * If Options has id search proof by proof id,
   * Else if Options has position search proof by list index,
   * Else Options is empty, returns first proof in list
   */
  proof(options?: ProofOpt): ZkcProof {
    if (options?.id) {
      const proof = this.proofs.find(({ id: proofId }) => proofId === options.id);
      if (proof) return proof;
      throw new Error(`ZK Credential Proof with id ${options.id} not found`);
    } else if (options?.position) {
      const proof = this.proofs[options.position];
      if (proof) return proof;
      throw new Error(`ZK Credential Proof with position ${options.position} not found`);
    } else {
      const proof = this.proofs[0];
      if (proof) return proof;
      throw new Error(`ZK Credential haven't any proof`);
    }
  }

  /** Return unproved credential */
  get cred(): Omit<TCred, "proof"> {
    return this.credential;
  }

  credAndProof(options?: ProofOpt): {
    cred: Omit<TCred, "proof">,
    proof: ZkcProof
  } {
    return {
      cred: this.cred,
      proof: this.proof(options)
    };
  }

}
