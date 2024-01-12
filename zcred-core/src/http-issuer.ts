import {
  BrowserIssueParams,
  CanIssue,
  CanIssueReq,
  Challenge,
  ChallengeReq,
  IHttpIssuer,
  Info,
  IssueReq,
} from "./types/issuer.js";
import { HttpCredential } from "./types/index.js";
import { repeatUtil } from "./utils/repeat.js";

export class HttpIssuer implements IHttpIssuer {
  readonly uri: URL;

  constructor(
    issuerURI: string,
    private readonly accessToken?: string
  ) {
    this.uri = new URL(issuerURI);
    const paths = this.uri.pathname;
    const type = paths[paths.length - 1];
    if (!type) {
      throw new Error(`Http issuer initialization error: issuer endpoint pathname is undefined, endpoint: ${issuerURI}`);
    }
  }

  static init(endpoint: string, accessToken?: string): IHttpIssuer {
    return new HttpIssuer(endpoint, accessToken);
  }

  async getInfo(): Promise<Info> {
    const url = new URL("./info", this.uri);
    const resp = await fetch(url);
    if (resp.ok) return await resp.json();
    const text = await resp.text();
    throw new Error(
      `HTTP request to '${url.href}' failed with status '${resp.statusText}': ${text}`
    );
  }

  async getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    const url = new URL("./challenge", this.uri);
    const resp = await fetch(new URL("./challenge", this.uri), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(challengeReq)
    });
    if (resp.ok) return await resp.json();
    const text = await resp.text();
    throw new Error(
      `HTTP request to '${url.href}' failed with status '${resp.statusText}': ${text}`
    );
  }

  async canIssue(canIssueReq: CanIssueReq): Promise<CanIssue> {
    const url = new URL("./can-issue", this.uri);
    const resp = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(canIssueReq)
    });
    if (resp.ok) return await resp.json();
    const text = await resp.text();
    throw new Error(
      `HTTP request to '${url.href}' failed with status '${resp.statusText}': ${text}`
    );
  }

  async issue<
    TCred extends HttpCredential = HttpCredential
  >(issueReq: IssueReq): Promise<TCred> {
    const url = new URL("./issue", this.uri);
    const resp = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(issueReq)
    });
    if (resp.ok) return await resp.json();
    const text = await resp.text();
    throw new Error(
      `HTTP request to '${url.href}' failed with status '${resp.statusText}': ${text}`
    );
  }

  async updateProofs?<
    TCred extends HttpCredential = HttpCredential
  >(cred: TCred): Promise<TCred> {
    const url = new URL("./update-proofs", this.uri);
    const resp = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(cred)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(JSON.stringify(body));
  }

  async browserIssue?<
    TCred extends HttpCredential = HttpCredential
  >({
    challengeReq,
    sign,
    windowOptions,
  }: BrowserIssueParams): Promise<TCred> {
    const challenge = await this.getChallenge(challengeReq);
    if (challenge.verifyURL) {
      const popup = window.open(
        challenge.verifyURL,
        windowOptions?.target,
        windowOptions?.feature
      );
      if (!popup) {
        throw new Error(`Can not open popup window to issue credential, popup URL: ${challenge.verifyURL}`);
      }
      const result = await repeatUtil<boolean>(
        (r) => (r instanceof Error) ? true : r,
        1000,
        async () => {
          return (await this.canIssue({ sessionId: challenge.sessionId })).canIssue;
        }
      );
      if (result instanceof Error) throw result;
    }
    const signature = await sign({ message: challenge.message });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature
    });
  }


  private get headers(): HeadersInit {
    if (this.accessToken) return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`
    };
    return { "Content-Type": "application/json" };
  }
}