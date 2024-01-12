import { type Challenge, type HttpClient, type IssuerTypes, } from "zkc-core";
import { popupFeatures, util } from "../util/index.js";
import { Schema, toSchemaName } from "../type/schemas.js";
import { ISybilIssuer, SybilChallengeReq, type SybilCred } from "../type/cred.js";
import { SybilWalletProof } from "../type/index.js";

export const GOVERNMENT_ID_TYPES = [
  1, // Passport
  2, // Driver license
  3, // Identification card
  4, // Passport card
  0, // OTHER - something that we do not support now
] as const;

export type GovernmentIdType = typeof GOVERNMENT_ID_TYPES[number]

export type PassportCred = SybilCred<{
  fn: string;
  ln: string;
  bd: number;
  cc: number;
  doc: {
    t: GovernmentIdType;
    id: string;
  }
}>

export interface PassportChallenge extends Challenge {
  verifyURL: string;
}

export interface PassportChallengeReq extends SybilChallengeReq {}

export type PassportOptions = PassportChallengeReq["options"]

export interface PassportIT extends IssuerTypes {
  ChallengeReq: PassportChallengeReq;
  Challenge: PassportChallenge;
  Cred: PassportCred;
  Options: PassportOptions & { windowFeature?: string; };
}

export class PassportIssuer implements ISybilIssuer<PassportIT> {

  constructor(
    private readonly client: HttpClient
  ) {}

  get providedSchema(): Schema { return 0;};

  getChallenge(
    challengeReq: PassportIT["ChallengeReq"]
  ): Promise<PassportIT["Challenge"]> {
    return this.client.getChallenge({
      path: util.EPs.v1(toSchemaName(this.providedSchema)).challenge,
      challengeReq,
    });
  }

  canIssue(
    entry: PassportIT["CanIssueReq"]
  ): Promise<PassportIT["CanIssueResp"]> {
    return this.client.canIssue({
      path: util.EPs.v1(toSchemaName(this.providedSchema)).canIssue,
      canIssueReq: entry
    });
  }

  issue(issueReq: PassportIT["IssueReq"]): Promise<PassportIT["Cred"]> {
    return this.client.issue({
      path: util.EPs.v1(toSchemaName(this.providedSchema)).issue,
      issueReq: issueReq
    });
  }

  async issueCred(args: {
    proof: SybilWalletProof;
    options?: PassportIT["Options"];
  }): Promise<PassportIT["Cred"]> {
    const {
      proof: {
        subjectId,
        signFn
      }, options
    } = args;
    const challengeReq: PassportIT["ChallengeReq"] = {
      subjectId: subjectId,
      options: options
    };
    const challenge = await this.getChallenge(challengeReq);
    const popup = window.open(
      challenge.verifyURL,
      "_blank",
      options?.windowFeature ? options.windowFeature : popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Discord`);
    const result = await util.repeat<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      async () => {
        return (await this.canIssue({ sessionId: challenge.sessionId })).canIssue;
      }
    );
    if (result instanceof Error) throw result;
    const signature = await signFn({ message: challenge.message });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature
    });
  }
}
