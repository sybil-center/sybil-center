import { Proved, ZkcIdType, ZkCred } from "./zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";

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
