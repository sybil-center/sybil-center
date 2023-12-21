import { ZkCredential } from "./zk-credentials.js";

export interface ICredentialVerifier<
  TSelector extends { reference: string } = { reference: string }
> {
  /** proof type which verifier provide */
  proofType: string;

  /** verify function */
  verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, selector?: TSelector): Promise<boolean>;
}