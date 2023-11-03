import { Proved, ZkcIdType, ZkCred } from "./zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { IDType, ProofType, SybilCred, SybilProof } from "@sybil-center/zkc-core";

/** Sign ZKC or message by private */
export interface IZkcSigner {

  /** Signer identifier or public key or address derived from private key */
  identifier: { t: ZkcIdType; k: string };

  /** Create Proofed ZK Credential */
  signZkCred<TCred extends ZkCred = ZkCred>(
    props: Omit<TCred, "isr">,
    transSchema: TransCredSchema
  ): Promise<Proved<TCred>>;
}

export interface IZKCSigner {
  proofType: ProofType;
  identifier: { t: IDType, k: string };
  signAttributes<
    TAttr extends SybilCred["attributes"] = SybilCred["attributes"]
  >(args: {
    attributes: TAttr
  }): Promise<SybilProof>;
}
