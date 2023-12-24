import { ICredentialVerifier, SignProofType, zcredUtil, ZkCredential } from "@zcredjs/core";
import { O1TrGraph } from "o1js-trgraph";
import { Field, Poseidon, PublicKey, Signature } from "o1js";

const trGraph = new O1TrGraph();

export class MinaPoseidonPastaVerifier implements ICredentialVerifier {
  get proofType(): SignProofType {
    return "mina:poseidon-pasta";
  };

  /** verify function */
  async verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, selector: { reference: string }): Promise<boolean> {

    const proof = cred.proofs[this.proofType]?.[selector.reference];
    if (!proof) {
      throw new Error(`Can not find proof with type ${this.proofType} and reference {${selector.reference}`);
    }
    if (!zcredUtil.isSignatureProof(proof)) {
      throw new Error(`Found proof is not signature proof. Proof type ${this.proofType}, reference {${selector.reference}`);
    }
    const attributesSchema = proof.schema.attributes;
    const signature = Signature.fromBase58(proof.signature);
    const issuerPublicKey = PublicKey.fromBase58(proof.issuer.id.key);
    const { linear } = trGraph.objectTransform<{}, Field[]>(
      cred.attributes,
      attributesSchema
    );
    const hash = Poseidon.hash(linear);
    return signature.verify(issuerPublicKey, [hash]).toBoolean();
  };
}
