import { ICredentialVerifier } from "./types/index.js";
import { HttpIssuer } from "./http-issuer.js";
import { IHttpIssuer } from "./types/issuer.js";
import { ZkCredential } from "./types/index.js";

export type InitOptions = {
  verifiers?: Record<string, ICredentialVerifier>
}

export type ProofSelector = {
  namespace: string;
  reference: string;
}

export class ZCred {
  readonly verifiers = new VerifierManager();
  constructor() {}

  static init(options?: InitOptions): ZCred {
    const zcred = new ZCred();
    if (!options) return zcred;
    if (options.verifiers) {
      for (const type of Object.keys(options.verifiers)) {
        const verifier = options.verifiers[type]!;
        zcred.verifiers.add(type, verifier);
      }
    }
    return zcred;
  }

  getHttpIssuer(endpoint: string, accessToken?: string): IHttpIssuer {
    return new HttpIssuer(endpoint, accessToken);
  }

  async verifyCred(cred: ZkCredential, selector: ProofSelector): Promise<boolean> {
    const verifier = this.verifiers.get(selector.namespace);
    return verifier.verify(cred, selector);
  }
}

class VerifierManager {
  private readonly verifierMap: Map<string, ICredentialVerifier> = new Map();

  add(type: string, verifier: ICredentialVerifier) {
    this.verifierMap.set(type, verifier);
  }
  delete(type: string) {
    this.verifierMap.delete(type);
  }
  get(type: string): ICredentialVerifier {
    const verifier = this.verifierMap.get(type);
    if (verifier) return verifier;
    throw new Error(`Verifier with provided type${type} is not found`);
  }
}



