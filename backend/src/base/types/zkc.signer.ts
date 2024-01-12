import { IDType, ProofType, SybilCred, SybilProof } from "@sybil-center/zkc-core";

export interface IZKCSigner {
  proofType: ProofType;
  identifier: { t: IDType, k: string };
  signAttributes<
    TAttr extends SybilCred["attributes"] = SybilCred["attributes"]
  >(args: {
    attributes: TAttr
  }): Promise<SybilProof>;
}
