import { randomUUID } from "node:crypto";
import { ClientError, ServerError } from "../backbone/errors.js";
import { VCType } from "../base/model/const/vc-type.js";

export interface FromMessageResult {
  id: string;
  custom?: object;
  description: string;
}

export interface ChallengeEntry {
  description: string;
  nonce: string;
  custom?: object;
}

/**
 *
 * @param type type of credential
 * @param custom object with custom properties
 */
export function toIssueChallenge(type: VCType, custom?: object): string {
  let description = `Sign this message to issue '${type}' credential.`;
  const nonce = randomUUID();
  const challenge: ChallengeEntry = {
    description: description,
    nonce: nonce
  }
  if (custom) {
    challenge.description +=
      ` In 'custom' property you can see additional fields which will be in credential`
    challenge.custom = custom;
  }
  try {
    return JSON.stringify(challenge, null, 2);
  } catch (e) {
    throw new ClientError(`Incorrect "custom" properties`)
  }
}

export function fromIssueChallenge(message: string): FromMessageResult {
  try {
    return JSON.parse(message) as FromMessageResult
  } catch (e) {
    throw new ServerError("Internal server error",  {
      props: {
        _place: fromIssueChallenge.name,
        _log: `From sign message conversion error. Input message: ${message}. Error: ${e}`
      }
    })
  }
}
