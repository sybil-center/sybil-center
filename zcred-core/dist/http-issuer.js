import { repeatUtil } from "./util.js";
export class HttpIssuer {
    constructor(endpoint, accessToken) {
        this.accessToken = accessToken;
        this.endpoint = new URL(endpoint);
        const paths = this.endpoint.pathname;
        const type = paths[paths.length - 1];
        if (!type) {
            throw new Error(`Http issuer initialization error: issuer endpoint pathname is undefined, endpoint: ${endpoint}`);
        }
        this.credentialType = type;
    }
    async getChallenge(challengeReq) {
        const resp = await fetch(new URL("./challenge", this.endpoint), {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(challengeReq)
        });
        const body = await resp.json();
        if (resp.ok)
            return body;
        throw new Error(body);
    }
    async canIssue(canIssueReq) {
        const resp = await fetch(new URL("./can-issue", this.endpoint), {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(canIssueReq)
        });
        const body = await resp.json();
        if (resp.ok)
            return body;
        throw new Error(body);
    }
    async issue(issueReq) {
        const resp = await fetch(new URL("./issue", this.endpoint), {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(issueReq)
        });
        const body = await resp.json();
        if (resp.ok)
            return body;
        throw new Error(body);
    }
    async issueCredential({ challengeReq, sign, windowOptions, }) {
        const challenge = await this.getChallenge(challengeReq);
        if (challenge.redirectURL) {
            const popup = window.open(challenge.redirectURL, windowOptions?.target, windowOptions?.feature);
            if (!popup) {
                throw new Error(`Can not open popup window to issue credential, popup URL: ${challenge.redirectURL}`);
            }
            const result = repeatUtil((r) => (r instanceof Error) ? true : r, 1000, async () => {
                return (await this.canIssue({ sessionId: challenge.sessionId })).canIssue;
            });
            if (result instanceof Error)
                throw result;
        }
        const signature = await sign({ message: challenge.message });
        return this.issue({
            sessionId: challenge.sessionId,
            signature: signature
        });
    }
    get headers() {
        if (this.accessToken)
            return {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.accessToken}`
            };
        return { "Content-Type": "application/json" };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1pc3N1ZXIuanMiLCJzb3VyY2VSb290IjoiLi9zcmMvIiwic291cmNlcyI6WyJodHRwLWlzc3Vlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFVQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXZDLE1BQU0sT0FBTyxVQUFVO0lBSXJCLFlBQ0UsUUFBZ0IsRUFDQyxXQUFvQjtRQUFwQixnQkFBVyxHQUFYLFdBQVcsQ0FBUztRQUVyQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1FBQ3JDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLElBQUksS0FBSyxDQUFDLHNGQUFzRixRQUFRLEVBQUUsQ0FBQyxDQUFDO1NBQ25IO1FBQ0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7SUFDN0IsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBMEI7UUFDM0MsTUFBTSxJQUFJLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUM5RCxNQUFNLEVBQUUsTUFBTTtZQUNkLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUM7U0FDbkMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDL0IsSUFBSSxJQUFJLENBQUMsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFD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