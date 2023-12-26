import { ZkCredential } from "./zk-credentials.js";
export interface ICredentialVerifier {
    /** proof type which verifier provide */
    proofType: string;
    /** verify function */
    verify<TCred extends ZkCredential = ZkCredential>(cred: TCred, reference?: string): Promise<boolean>;
}
