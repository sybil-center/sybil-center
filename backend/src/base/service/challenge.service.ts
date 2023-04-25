import { randomUUID } from "node:crypto";
import { ClientError } from "../../backbone/errors.js";
import { AnyObj } from "../../util/model.util.js";
import { CredentialType } from "@sybil-center/sdk/types";
import * as t from "io-ts";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";

export type IssueChallengeOpt = {
  subjectId: string;
  type: CredentialType;
  custom?: AnyObj;
  expirationDate?: Date;
  ethereumProps?: { value?: string[], default: string[] };
  githubProps?: { value?: string[], default: string[] };
  discordProps?: { value?: string[], default: string[] };
  twitterProps?: { value?: string[], default: string[] };
}

export type ChallengeEntry = {
  description: string;
  subjectId: string;
  nonce: string;
  type?: string;
  custom?: AnyObj;
  expirationDate?: Date;

  ethereumProps?: string[];
  githubProps?: string[];
  twitterProps?: string[];
  discordProps?: string[];
}

/** JSON object containing Message key => JSON key mapping and vice versa */
const createMsgJsonTable = (): { [key: string]: string } => {
  const obj: { [key: string]: keyof ChallengeEntry} = {
    "Description:": "description",
    "Subject id:": "subjectId",
    "nonce:": "nonce",
    "Subject custom property:": "custom",
    "Credential expiration date:": "expirationDate",
    "Credential type:": "type",
    "Subject ethereum properties:": "ethereumProps",
    "Subject discord properties:": "discordProps",
    "Subject github properties:" : "githubProps",
    "Subject twitter properties:" : "twitterProps",
  };
  const keys = Object.keys(obj);
  keys.forEach((key) => {
    const value = obj[key]! as string;
    (obj as any)[value] = key;
  });
  return obj;
};

const MsgJsonTable = createMsgJsonTable();

/** For transforming JSON challenge representation to message representation */
const jsonChallengeAsMessage = new t.Type<
  string,
  string,
  ChallengeEntry
>(
  "JsonChallenge-As-Message",
  (input: any): input is string => typeof input === "string",
  (input: any, context) => {
    try {
      const custom = input.custom;
      input.custom = custom ? JSON.stringify(custom, null, 1) : undefined;
      const expirationDate = input.expirationDate;
      input.expirationDate = expirationDate ? expirationDate.toISOString() : undefined;
      input.ethereumProps = JSON.stringify(input.ethereumProps, null, 2);
      input.discordProps = JSON.stringify(input.discordProps, null, 2);
      input.githubProps = JSON.stringify(input.githubProps, null, 2);
      input.twitterProps = JSON.stringify(input.twitterProps, null, 2);

      const msg: string[] = [];
      const keys = Object
        .keys(input)
        .filter((key) => input[key] !== undefined);
      keys.forEach((jsonKey) => {
        let value = (input as any)[jsonKey]!;
        const msgKey = MsgJsonTable[jsonKey];
        if (!msgKey) throw new Error("Incorrect challenge object");
        msg.push([msgKey, value].join("\n"));
      });
      return t.success(msg.join("\n\n"));
    } catch (e) {
      return t.failure(input, context, String(e));
    }
  },
  (msg) => msg
);

/** For transforming message representation to JSON challenge representation */
const messageAsJsonChallenge = new t.Type<
  ChallengeEntry,
  ChallengeEntry,
  string
>(
  "Message-as-JsonChallenge",
  (input: any): input is ChallengeEntry => {
    return typeof input.description === "string"
      && typeof input.publicId === "string"
      && typeof input.nonce === "string";
  },
  (input: string, context) => {
    try {
      const sections = input.split("\n\n");
      const json: AnyObj = {};
      sections.forEach((section) => {
        const split = section.split("\n");
        const msgKey = split[0];
        const value = split.slice(1).join("\n");
        if (!msgKey || !value) throw new Error(`Message is incorrect`);
        const key = MsgJsonTable[msgKey];
        if (!key) throw new Error(`Message is incorrect`);
        json[key] = value;
      });
      const expirationDate = json.expirationDate;
      json.expirationDate = expirationDate ? new Date(expirationDate) : undefined;
      json.custom = json.custom ? JSON.parse(json.custom) : undefined;
      json.ethereumProps = json.ethereumProps ? JSON.parse(json.ethereumProps) : undefined
      json.discordProps = json.discordProps ? JSON.parse(json.discordProps) : undefined;
      json.githubProps = json.githubProps ? JSON.parse(json.githubProps) : undefined;
      json.twitterProps = json.twitterProps ? JSON.parse(json.twitterProps) : undefined;
      return t.success(json as ChallengeEntry);
    } catch (e) {
      return t.failure(input, context, String(e));
    }
  },
  (challenge) => challenge
);

/**
 * @param opt - options for issue challenge
 */
export function toIssueChallenge(opt: IssueChallengeOpt): string {
  const nonce = randomUUID();
  const description = `Sign the message to issue '${opt.type}' verifiable credential`;
  const expirationDate = opt.expirationDate ? opt.expirationDate : undefined;
  const custom = opt.custom ? opt.custom : undefined;
  const ethereumProps = opt.ethereumProps?.value
    ? opt.ethereumProps?.value
    : opt.ethereumProps?.default;
  const discordProps = opt.discordProps?.value
    ? opt.discordProps?.value
    : opt.discordProps?.default;
  const githubProps = opt.githubProps?.value
    ? opt.githubProps?.value
    : opt.githubProps?.default;
  const twitterProps = opt.twitterProps?.value
    ? opt.twitterProps.value
    : opt.twitterProps?.default

  const challenge: ChallengeEntry = {
    description: description,
    type: opt.type,
    subjectId: opt.subjectId,
    expirationDate: expirationDate,
    ethereumProps: ethereumProps,
    discordProps: discordProps,
    githubProps: githubProps,
    twitterProps: twitterProps,
    custom: custom,
    nonce: nonce,
  };

  return ThrowDecoder.decode(
    jsonChallengeAsMessage,
    challenge,
    new ClientError("Incorrect properties")
  );
}

/** Transform issue challenge message to JSON representation */
export function fromIssueChallenge(challenge: string): ChallengeEntry {
  return ThrowDecoder.decode(messageAsJsonChallenge, challenge);
}
