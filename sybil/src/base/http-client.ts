import { canIssueEP, challengeEP, issueEP, verifyCredentialEP } from "../util/index.js";
import { APIKeys, Credential, CredentialType, VerifyResult } from "../types/index.js";
import { parse } from "../util/parse.util.js";
import { AtLeastOne } from "./types/useful.js";

const DEFAULT_ENDPOINT = new URL("https://api.sybil.center");

export class HttpClient {

  constructor(
    private readonly apiKeys: AtLeastOne<APIKeys>,
    readonly issuerDomain: URL = DEFAULT_ENDPOINT,
  ) {}

  async challenge<
    TResponse, // TODO It should be unknown
    TParams = any
  >(credentialType: CredentialType, params?: TParams): Promise<TResponse> {
    // FIXME ts-essential Opaque
    const endpoint = new URL(challengeEP(credentialType), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKeys.apiKey}`
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
  async canIssue(
    credentialType: CredentialType,
    sessionId: string
  ): Promise<boolean> {
    const endpoint = new URL(canIssueEP(credentialType), this.issuerDomain);
    endpoint.searchParams.set("sessionId", sessionId);
    const resp = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKeys.apiKey}`
      }
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return Boolean((body.canIssue));
    }
    throw new Error(body.message);
  }

  async issue<
    TResponse = Credential,
    TParams = any
  >(credentialType: CredentialType, params: TParams): Promise<TResponse> {
    const endpoint = new URL(issueEP(credentialType), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKeys.apiKey}`
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return parse(body, "credential") as TResponse;
    }
    throw new Error(body.message);
  }

  async verify<
    TCredential = Credential,
    TVerifyResult = VerifyResult
  >(credential: TCredential): Promise<TVerifyResult> {
    const endpoint = new URL(verifyCredentialEP(), this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credential)
    });
    const body = await resp.json();
    if (resp.status === 200) return body
    throw new Error(body.message)
  }
}
