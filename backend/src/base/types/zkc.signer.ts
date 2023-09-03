import { ZkCredential, ZkCredProofed } from "./zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";

/** Sign ZKC or message by private */
export interface IZkcSigner {

  /** Signer identifier or public key or address derived from private key */
  identifier: { t: number; k: string };

  /** Create Proofed ZK Credential */
  signZkCred(
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): Promise<ZkCredProofed>;
}
