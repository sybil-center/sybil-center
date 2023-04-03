import { randomUUID } from "node:crypto";
import { ClientError, ServerError } from "../backbone/errors.js";
import { AnyObject } from "./model.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

export interface FromChallenge {
  id: string;
  custom?: object;
  description: string;
  expirationDate: Date;
}

export interface IssueChallengeOpt {
  type: CredentialType;
  custom?: AnyObject;
  expirationDate?: Date;
}

export interface ChallengeEntry {
  description: string;
  nonce: string;
  custom?: AnyObject;
  expirationDate?: Date;
}

/**
 * @param opt - options for issue challenge
 */
export function toIssueChallenge(opt: IssueChallengeOpt): string {
  let description = `Sign this message to issue '${opt.type}' credential.`;
  const nonce = randomUUID();
  const challenge: ChallengeEntry = {
    description: description,
    nonce: nonce
  };

  if (opt.custom) {
    challenge.description +=
      ` In 'custom' field you can see additional fields which will be in credential.`;
    challenge.custom = opt.custom;
  }
  if (opt.expirationDate) {
    challenge.description +=
      ` Credential expiration date represented in 'expirationDate' field.`;
    challenge.expirationDate = opt.expirationDate;
  }

  try {
    return JSON.stringify(challenge, null, 2);
  } catch (e) {
    throw new ClientError(`Incorrect "custom" properties`);
  }
}

export function fromIssueChallenge(challenge: string): FromChallenge {
  try {
    return JSON.parse(challenge) as FromChallenge;
  } catch (e) {
    throw new ServerError("Internal server error", {
      props: {
        _place: fromIssueChallenge.name,
        _log: `From sign message conversion error. Input message: ${challenge}. Error: ${e}`
      }
    });
  }
}
