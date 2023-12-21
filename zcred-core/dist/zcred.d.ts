import { ICredentialVerifier } from "./types/index.js";
import { IHttpIssuer } from "./types/issuer.js";
import { ZkCredential } from "./types/index.js";
export type InitOptions = {
    verifiers?: Record<string, ICredentialVerifier>;
};
export type ProofSelector = {
    namespace: string;
    reference: string;
};
export declare class ZCred {
    readonly verifiers: VerifierManager;
    constructor();
    static init(options?: InitOptions): ZCred;
    getHttpIssuer(endpoint: string, accessToken?: string): IHttpIssuer;
    verifyCred(cred: ZkCredential, selector: ProofSelector): Promise<boolean>;
}
declare class VerifierManager {
    private readonly verifierMap;
    add(type: string, verifier: ICredentialVerifier): void;
    delete(type: string): void;
    get(type: string): ICredentialVerifier;
}
export {};
