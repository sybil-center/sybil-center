import { HttpIssuer } from "./http-issuer.js";
export class ZCred {
    constructor() {
        this.verifiers = new VerifierManager();
    }
    static init(options) {
        const zcred = new ZCred();
        if (!options)
            return zcred;
        if (options.verifiers) {
            for (const type of Object.keys(options.verifiers)) {
                const verifier = options.verifiers[type];
                zcred.verifiers.add(type, verifier);
            }
        }
        return zcred;
    }
    getHttpIssuer(endpoint, accessToken) {
        return new HttpIssuer(endpoint, accessToken);
    }
    async verifyCred(cred, selector) {
        const verifier = this.verifiers.get(selector.namespace);
        return verifier.verify(cred, selector);
    }
}
class VerifierManager {
    constructor() {
        this.verifierMap = new Map();
    }
    add(type, verifier) {
        this.verifierMap.set(type, verifier);
    }
    delete(type) {
        this.verifierMap.delete(type);
    }
    get(type) {
        const verifier = this.verifierMap.get(type);
        if (verifier)
            return verifier;
        throw new Error(`Verifier with provided type${type} is not found`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiemNyZWQuanMiLCJzb3VyY2VSb290IjoiLi9zcmMvIiwic291cmNlcyI6WyJ6Y3JlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFhOUMsTUFBTSxPQUFPLEtBQUs7SUFFaEI7UUFEUyxjQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRWhCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBcUI7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMxQixJQUFJLENBQUMsT0FBTztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQzNCLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRTtZQUNyQixLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUNqRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBRSxDQUFDO2dCQUMxQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDckM7U0FDRjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELGFBQWEsQ0FBQyxRQUFnQixFQUFFLFdBQW9CO1FBQ2xELE9BQU8sSUFBSSxVQUFVLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWtCLEVBQUUsUUFBdUI7UUFDMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekMsQ0FBQztDQUNGO0FBRUQsTUFBTSxlQUFlO0lBQXJCO1FBQ21CLGdCQUFXLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUM7SUFhN0UsQ0FBQztJQVhDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsUUFBNkI7UUFDN0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBWTtRQUNqQixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBQ0QsR0FBRyxDQUFDLElBQVk7UUFDZCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLFFBQVE7WUFBRSxPQUFPLFFBQVEsQ0FBQztRQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixJQUFJLGVBQWUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7Q0FDRiJ9