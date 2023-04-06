import { randomUUID } from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { AnyObj } from "../../util/model.util.js";
import { CredentialType } from "@sybil-center/sdk/types";
import * as t from "io-ts";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";

type RawFromChallenge = {
  description: string;
  publicId: string;
  nonce: string;
  custom?: object;
  expirationDate?: Date;
}

const stringAsFromChallenge = new t.Type<
  RawFromChallenge,
  RawFromChallenge,
  string
>(
  "String-as-FromChallenge",
  (input: any): input is RawFromChallenge => {
    return typeof input.description === "string"
      && typeof input.publicId === "string"
      && typeof input.nonce === "string"
  },
  (input: string, context) => {
    try {
      const fromChallenge = JSON.parse(input);
      const expirationDate = fromChallenge.expirationDate;
      fromChallenge.expirationDate = expirationDate
        ? new Date(expirationDate)
        : undefined
      return t.success(fromChallenge as RawFromChallenge)
    } catch (e) {
      return t.failure(input, context, String(e))
    }
  },
  (fromChallenge) => fromChallenge
);

export const FromChallenge = stringAsFromChallenge

export type FromChallenge = t.TypeOf<typeof FromChallenge>


export type IssueChallengeOpt = {
  type: CredentialType;
  custom?: AnyObj;
  expirationDate?: Date;
  publicId: string;
}

export type ChallengeEntry = {
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
  ];
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
  return ThrowDecoder.decode(FromChallenge, challenge);
}
