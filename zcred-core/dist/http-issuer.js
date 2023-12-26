import { repeatUtil } from "./utils/repeat.js";
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
    async browserIssue({ challengeReq, sign, windowOptions, }) {
        const challenge = await this.getChallenge(challengeReq);
        if (challenge.verifyURL) {
            const popup = window.open(challenge.verifyURL, windowOptions?.target, windowOptions?.feature);
            if (!popup) {
                throw new Error(`Can not open popup window to issue credential, popup URL: ${challenge.verifyURL}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC1pc3N1ZXIuanMiLCJzb3VyY2VSb290IjoiLi9zcmMvIiwic291cmNlcyI6WyJodHRwLWlzc3Vlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFVQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFFL0MsTUFBTSxPQUFPLFVBQVU7SUFJckIsWUFDRSxRQUFnQixFQUNDLFdBQW9CO1FBQXBCLGdCQUFXLEdBQVgsV0FBVyxDQUFTO1FBRXJDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7UUFDckMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsc0ZBQXNGLFFBQVEsRUFBRSxDQUFDLENBQUM7U0FDbkg7UUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztJQUM3QixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxZQUEwQjtRQUMzQyxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlELE1BQU0sRUFBRSxNQUFNO1lBQ2QsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQztTQUNuQyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxFQUFFO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUF3QjtRQUNyQyxNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzlELE1BQU0sRUFBRSxNQUFNO1lBQ2QsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxFQUFFO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUssQ0FFVCxRQUFrQjtRQUNsQixNQUFNLElBQUksR0FBRyxNQUFNLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQzFELE1BQU0sRUFBRSxNQUFNO1lBQ2QsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQixJQUFJLElBQUksQ0FBQyxFQUFFO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDekIsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FFaEIsRUFDQSxZQUFZLEVBQ1osSUFBSSxFQUNKLGFBQWEsR0FDTTtRQUNuQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEQsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFO1lBQ3ZCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQ25CLGFBQWEsRUFBRSxNQUFNLEVBQ3JCLGFBQWEsRUFBRSxPQUFPLENBQ3ZCLENBQUM7WUFDRixJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO2FBQ3JHO1lBQ0QsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUN2QixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN0QyxJQUFJLEVBQ0osS0FBSyxJQUFJLEVBQUU7Z0JBQ1QsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUM1RSxDQUFDLENBQ0YsQ0FBQztZQUNGLElBQUksTUFBTSxZQUFZLEtBQUs7Z0JBQUUsTUFBTSxNQUFNLENBQUM7U0FDM0M7UUFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM3RCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDaEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTO1lBQzlCLFNBQVMsRUFBRSxTQUFTO1NBQ3JCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxJQUFZLE9BQU87UUFDakIsSUFBSSxJQUFJLENBQUMsV0FBVztZQUFFLE9BQU87Z0JBQzNCLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLGFBQWEsRUFBRSxVQUFVLElBQUksQ0FBQyxXQUFXLEVBQUU7YUFDNUMsQ0FBQztRQUNGLE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0NBQ0YifQ==