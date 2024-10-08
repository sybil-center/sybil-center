import { VECode } from "@zcredjs/core";

export type JsonVerifierException = {
  code: VECode;
  msg?: string;
  desc?: string;
  cause?: Error;
}

export class VerifierException extends Error implements JsonVerifierException {

  readonly code: JsonVerifierException["code"];
  readonly msg: JsonVerifierException["msg"];
  readonly desc: JsonVerifierException["desc"];
  override readonly cause: JsonVerifierException["cause"];

  constructor({
    code,
    msg,
    desc,
    cause
  }: JsonVerifierException) {
    super(msg);
    this.cause = cause;
    this.code = code;
    this.msg = msg;
    this.desc = desc;
    this.cause = cause;
  }
}