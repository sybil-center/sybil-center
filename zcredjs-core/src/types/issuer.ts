import { Challenge, ChallengeReq, IHttpIssuer } from "zcred-core";
import { ZIdentifier } from "./credential.js";
import { CredType } from "./index.js";

export interface ZChallengeReq extends ChallengeReq {
  subject: {
    id: ZIdentifier;
  };
}


export interface IZHttpIssuer extends IHttpIssuer {
  getChallenge(challengeReq: ZChallengeReq): Promise<Challenge>;
  credentialType: CredType;
}