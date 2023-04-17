import { randomUUID } from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { AnyObj } from "../../util/model.util.js";
import { Credential, CredentialType } from "@sybil-center/sdk/types";
import * as t from "io-ts";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";

type RawFromChallenge = {
  description: string;
  publicId: string;
  nonce: string;
  custom?: object;
  expirationDate?: Date;
  props?: string[]
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
      && typeof input.nonce === "string";
  },
  (input: string, context) => {
    try {
      const fromChallenge = JSON.parse(input);
      const expirationDate = fromChallenge.expirationDate;
      fromChallenge.expirationDate = expirationDate
        ? new Date(expirationDate)
        : undefined;
      return t.success(fromChallenge as RawFromChallenge);
    } catch (e) {
      return t.failure(input, context, String(e));
    }
  },
  (fromChallenge) => fromChallenge
);

export const FromChallenge = stringAsFromChallenge;

export type FromChallenge = t.TypeOf<typeof FromChallenge>


export type IssueChallengeOpt<
  TCredential extends Credential = Credential,
  TSubjectKey extends keyof TCredential["credentialSubject"] = keyof Credential["credentialSubject"],
  TProps = keyof TCredential["credentialSubject"][TSubjectKey]
> = {
  publicId: string;
  type: CredentialType;
  custom?: AnyObj;
  expirationDate?: Date;
  subProps: { name: TSubjectKey, props?: TProps[], allProps: TProps[] }
}

export type ChallengeEntry<
  TCredential extends Credential,
  TSubjectKey extends keyof TCredential["credentialSubject"],
  TProps = keyof TCredential["credentialSubject"][TSubjectKey]
> = {
  description: string;
  publicId: string;
  nonce: string;
  custom?: AnyObj;
  expirationDate?: Date;
  props?: TProps[];
}

/**
 * @param opt - options for issue challenge
 */
export function toIssueChallenge<
  TCredential extends Credential = Credential,
  TSubjectKey extends keyof TCredential["credentialSubject"] = keyof Credential["credentialSubject"],
  TProps = keyof TCredential["credentialSubject"][TSubjectKey]
>(opt: IssueChallengeOpt<TCredential, TSubjectKey, TProps>): string {
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

  let props: TProps[] | undefined = undefined;
  if (opt.subProps.props?.length === 0) {
    description.push(
      `Credential subject ${String(opt.subProps.name)} field will not contain any properties.`
    );
  } else {
    if (!opt.subProps.props) props = opt.subProps.allProps;
    else props = opt.subProps.props;
    description.push(
      `Credential subject ${String(opt.subProps.name)} field`,
      `will contain properties represented in 'props' field of this message.`
    );
  }

  let custom: AnyObj | undefined = undefined;
  if (opt.custom) {
    custom = opt.custom;
    description.push(
      `In 'custom' field you can see additional fields which will be in credential.`
    );
  }

  const challenge: ChallengeEntry<TCredential, TSubjectKey, TProps> = {
    description: description.join(" "),
    publicId: opt.publicId,
    expirationDate: expirationDate,
    custom: custom,
    nonce: nonce,
    props: props
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
