import { canIssueEP, challengeEP, issueEP, ownerProofEP } from "../util/index.js";
import { CredentialType } from "../types/index.js";

export class HttpClient {

  constructor(
    readonly issuerDomain: URL
  ) {}

  async payload<
    TResponse, // TODO It should be unknown
    // TParams extends Record<string, string> = any TODO It should be some kind of Record<string, string>
    TParams = any
  >(credentialType: CredentialType, params?: TParams): Promise<TResponse> {
    // FIXME ts-essential Opaque
    const endpoint = new URL(challengeEP(credentialType), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return body;
    }
    throw new Error(body.message);
  }

  /**
   * If issuing is possible credential return true, else return false.
   * Throws error if response status code is not 200.
   * @param credentialType
   * @param sessionId
   * @throws error
   */
  async canIssue(credentialType: CredentialType, sessionId: string): Promise<boolean> {
    const endpoint = new URL(canIssueEP(credentialType), this.issuerDomain);
    endpoint.searchParams.set("sessionId", sessionId);
    const resp = await fetch(endpoint);
    const body = await resp.json();
    if (resp.status === 200) {
      return Boolean((body.canIssue));
    }
    throw new Error(body.message);
  }

  async issue<TResponse, TParams = any>(credentialType: CredentialType, params: TParams): Promise<TResponse> {
    const endpoint = new URL(issueEP(credentialType), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return body;
    }
    throw new Error(body.message);
  }


  async proof<TProofResp, TParams = any>(credentialType: CredentialType, params: TParams): Promise<TProofResp> {
    const endpoint = new URL(ownerProofEP(credentialType), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return body;
    }
    throw new Error(body.message);
  }
}
