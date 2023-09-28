import { IssuerTypes, IZkcIssuer, Option, ZkcChallenge, ZkcChallengeReq } from "../type/index.js";
import { Proved, ZkCred, ZkcSchemaNums } from "../type/index.js";
import { HttpClient } from "../http-client.js";
import { WalletProof } from "../type/index.js";
import { popupFeatures } from "../util/view.util.js";
import { repeatUntil } from "../util/repeat.util.js";

export const DOC_TYPES = [
  1, // Passport
  2, // Driver license
  3, // Identification card
  4, // Passport card
  0, // OTHER - something that we do not support now
] as const;

export type DocTypes = typeof DOC_TYPES[number]

export type PassportCred = ZkCred<{
  fn: string;
  ln: string;
  bd: number;
  cc: number;
  doc: {
    t: DocTypes;
    id: string;
  }
}>

export interface PassportChallengeReq extends ZkcChallengeReq {}

export interface PassportChallenge extends ZkcChallenge {
  verifyURL: string;
}

export interface PassportOptions extends Option<PassportChallengeReq> {
  windowFeature: string;
}

export interface PassportIT extends IssuerTypes {
  Challenge: PassportChallenge;
  Cred: Proved<PassportCred>;
  Options: PassportOptions;
}

export class PassportIssuer implements IZkcIssuer<PassportIT> {

  constructor(
    private readonly client: HttpClient
  ) {}

  get providedSchema(): ZkcSchemaNums { return 0;};

  getChallenge(
    challengeReq: PassportIT["ChallengeReq"]
  ): Promise<PassportIT["Challenge"]> {
    return this.client.challenge(this.providedSchema, challengeReq);
  }

  canIssue(
    entry: PassportIT["CanIssueReq"]
  ): Promise<PassportIT["CanIssueResp"]> {
    return this.client.canIssue(this.providedSchema, entry);
  }

  issue(issueReq: PassportIT["IssueReq"]): Promise<PassportIT["Cred"]> {
    return this.client.issue(this.providedSchema, issueReq);
  }

  async issueCred({
      subjectId,
      signFn
    }: WalletProof,
    options?: PassportIT["Options"]
  ): Promise<PassportIT["Cred"]> {
    const challenge = await this.getChallenge(options
      ? { ...options, subjectId: subjectId }
      : { subjectId: subjectId }
    );
    const popup = window.open(
      challenge.verifyURL,
      "_blank",
      options ? options.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Discord`);
    const result = await repeatUntil<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      async () => {
        return (await this.canIssue({
          sessionId: challenge.sessionId
        })).canIssue;
      }
    );
    if (result instanceof Error) throw result;
    const signature = await signFn({ message: challenge.message });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature,
    });
  }

}
