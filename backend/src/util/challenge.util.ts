import { randomUUID } from "node:crypto";
import { ClientError, ServerError } from "../backbone/errors.js";
import { AnyObj } from "./model.util.js";
import { CredentialType } from "@sybil-center/sdk/types";

export interface FromChallenge {
  description: string;
  publicId: string;
  nonce: string;
  custom?: object;
  expirationDate?: Date;
}

export interface IssueChallengeOpt {
  type: CredentialType;
  custom?: AnyObj;
  expirationDate?: Date;
  publicId: string;
}

export interface ChallengeEntry {
  description: string;
  publicId: string;
  nonce: string;
  custom?: AnyObj;
  expirationDate?: Date;
}

/**
 * @param opt - options for issue challenge
 */
export function toIssueChallenge(opt: IssueChallengeOpt): string {
  const description = [
    `Sign this message to issue '${opt.type}' credential.`,
    `Credential subject identifier will be associated with '${opt.publicId}'.`
  ]
  const nonce = randomUUID();

  let expirationDate: Date | undefined = undefined;
  if (opt.expirationDate) {
    expirationDate = opt.expirationDate;
    description.push(
      `Credential expiration date is ${expirationDate.toUTCString()}.`
    );
  }

  let custom: AnyObj | undefined = undefined;
  if (opt.custom) {
    custom = opt.custom;
    description.push(
      `In 'custom' field you can see additional fields which will be in credential.`
    );
  }

  const challenge: ChallengeEntry = {
    description: description.join(" "),
    publicId: opt.publicId,
    expirationDate: expirationDate,
    custom: custom,
    nonce: nonce
  };

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
