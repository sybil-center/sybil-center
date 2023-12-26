import { BrowserIssueParams, CanIssue, CanIssueReq, Challenge, ChallengeReq, IHttpIssuer, IssueReq } from "./types/issuer.js";
import { ZkCredential } from "./types/index.js";
export declare class HttpIssuer implements IHttpIssuer {
    private readonly accessToken?;
    readonly endpoint: URL;
    readonly credentialType: string;
    constructor(endpoint: string, accessToken?: string | undefined);
    getChallenge(challengeReq: ChallengeReq): Promise<Challenge>;
    canIssue(canIssueReq: CanIssueReq): Promise<CanIssue>;
    issue<TCred extends ZkCredential = ZkCredential>(issueReq: IssueReq): Promise<TCred>;
    browserIssue<TCred extends ZkCredential = ZkCredential>({ challengeReq, sign, windowOptions, }: BrowserIssueParams): Promise<TCred>;
    private get headers();
}
