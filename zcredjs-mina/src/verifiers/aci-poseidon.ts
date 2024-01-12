import { ACIProofType, ICredentialVerifier, Proof, zcredjs, ZkCredential } from "@zcredjs/core";
import sortKeys from "sort-keys";
import { Field, Poseidon } from "o1js";
import { o1jsTrGraph } from "../util.js";


export class MinaACIPoseidonVerifier implements ICredentialVerifier {

  static init(): ICredentialVerifier {
    return new MinaACIPoseidonVerifier();
  }

  get proofType(): ACIProofType { return "aci:mina-poseidon";};

  async verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, reference?: string): Promise<boolean> {
    const proof = this.getProof(cred, reference);
    if (!zcredjs.isACIProof(proof)) {
      return false;
    }
    const attributesSchema = sortKeys(proof.schema.attributes, { deep: true });
    const { linear } = o1jsTrGraph.objectTransform<{}, Field[]>(
      cred.attributes,
      attributesSchema
    );
    const hash = Poseidon.hash(linear);
    const aci = o1jsTrGraph.transform<string>(
      hash.toBigInt(),
      ["uint256-bytes", "bytes-base58"]
    );
    return aci === proof.aci;
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