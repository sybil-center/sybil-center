import { ICredentialVerifier, Proof, SignProofType, zcredjs, ZkCredential } from "@zcredjs/core";
import sortKeys from "sort-keys";
import { Field, Poseidon, PublicKey, Signature } from "o1js";
import { o1jsTrGraph } from "../util.js";


export class MinaPoseidonPastaVerifier implements ICredentialVerifier {

  static init(): ICredentialVerifier {
    return new MinaPoseidonPastaVerifier();
  }

  get proofType(): SignProofType { return "mina:poseidon-pasta";};

  async verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, reference?: string): Promise<boolean> {
    try {
      const proof = this.getProof(cred, reference);
      if (!zcredjs.isSignatureProof(proof)) return false;
      const attributesSchema = sortKeys(proof.schema.attributes, { deep: true });
      const { linear } = o1jsTrGraph.objectTransform<{}, Field[]>(
        cred.attributes,
        attributesSchema
      );
      const message = Poseidon.hash(linear);
      const issuerPublicKey = PublicKey.fromBase58(proof.issuer.id.key);
      const signature = Signature.fromBase58(proof.signature);
      return signature.verify(issuerPublicKey, [message]).toBoolean();
    } catch (e) {
      return false;
    }
  }

  private getProof(cred: ZkCredential, reference?: string): Proof {
    const namespace = cred.proofs[this.proofType];
    if (namespace) {
      const _reference = reference ? reference : Object.keys(namespace)[0];
      if (_reference && namespace[_reference]) return namespace[_reference]!;
    }
    throw new Error(`Can not find proof by proof type ${this.proofType} & reference ${reference}`);
  }
}