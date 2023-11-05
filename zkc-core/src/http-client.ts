import { CanIssueReq, CanIssueResp, Challenge, ChallengeReq, IssueReq, ZkCred } from "./types/index.js";

export class HttpClient {

  constructor(private readonly issuerDomain: URL) {}

  async getChallenge<
    TOut = Challenge,
    TIn extends ChallengeReq = ChallengeReq
  >(args: {
    path: string;
    challengeReq: TIn;
    headers?: Record<string, any>;
    method?: string
  }): Promise<TOut> {
    const endpoint = new URL(args.path, this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: args.method ? args.method : "POST",
      headers: {
        "Content-Type": "application/json",
        ...args.headers
      },
      body: JSON.stringify(args.challengeReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async canIssue<
    TOut = CanIssueResp,
    TIn extends CanIssueReq = CanIssueReq
  >(args: {
    path: string;
    canIssueReq: TIn;
    headers?: Record<string, any>;
    method?: string;
  }): Promise<TOut> {
    const endpoint = new URL(args.path, this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: args.method ? args.method : "POST",
      headers: {
        ...args.headers
      },
      body: JSON.stringify(args.canIssueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async issue<
    TOut = ZkCred,
    TIn extends IssueReq = IssueReq
  >(args: {
    path: string;
    issueReq: TIn;
    headers?: Record<string, any>;
    method?: string;
  }): Promise<TOut> {
    const endpoint = new URL(args.path, this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: args.method ? args.method : "POST",
      headers: {
        "Content-Type": "application/json",
        ...args.headers
      },
      body: JSON.stringify(args.issueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }
}