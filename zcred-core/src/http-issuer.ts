import {
  BrowserIssueParams,
  CanIssue,
  CanIssueReq,
  Challenge,
  ChallengeReq,
  IHttpIssuer,
  IssueReq,
} from "./types/issuer.js";
import { ZkCredential } from "./types/index.js";
import { repeatUtil } from "./utils/repeat.js";

export class HttpIssuer implements IHttpIssuer {
  readonly endpoint: URL;
  readonly credentialType: string;

  constructor(
    endpoint: string,
    private readonly accessToken?: string
  ) {
    this.endpoint = new URL(endpoint);
    const paths = this.endpoint.pathname;
    const type = paths[paths.length - 1];
    if (!type) {
      throw new Error(`Http issuer initialization error: issuer endpoint pathname is undefined, endpoint: ${endpoint}`);
    }
    this.credentialType = type;
  }

  async getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    const resp = await fetch(new URL("./challenge", this.endpoint), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(challengeReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async canIssue(canIssueReq: CanIssueReq): Promise<CanIssue> {
    const resp = await fetch(new URL("./can-issue", this.endpoint), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(canIssueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async issue<
    TCred extends ZkCredential = ZkCredential
  >(issueReq: IssueReq): Promise<TCred> {
    const resp = await fetch(new URL("./issue", this.endpoint), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(issueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async browserIssue<
    TCred extends ZkCredential = ZkCredential
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
      const result = repeatUtil<boolean>(
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