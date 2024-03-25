import { IECode, IssuerException as IssuerExceptionOrigin } from "@zcredjs/core";

type ErrInfo = {
  /** Message for Client */
  message: string;
  /** Error rise place  */
  place?: string;
  /** Cause error */
  cause?: Error;
  /** Error description for log */
  description?: string;
}

export class Err extends Error {
  readonly info: ErrInfo;
  constructor(args: ErrInfo | string) {
    if (typeof args === "string") {
      super(args);
      this.info = { message: args };
    } else {
      super(args.message);
      this.info = args;
    }
  }
}

interface HttpErrInfo extends ErrInfo {
  statusCode?: number;
}

interface ReqHttpErrInfo extends HttpErrInfo {
  statusCode: number;
}

export class ClientErr extends Err {
  override readonly info: ReqHttpErrInfo;
  constructor(args: HttpErrInfo | string) {
    if (typeof args === "string") {
      const info: ReqHttpErrInfo = { message: args, statusCode: 400 };
      super(info);
      this.info = info;
    } else {
      super(args);
      this.info = {
        ...args,
        statusCode: args.statusCode ? args.statusCode : 400,
      };
    }
  }
}

export class ServerErr extends Err {
  override readonly info: ReqHttpErrInfo;
  constructor(args: HttpErrInfo | string) {
    if (typeof args === "string") {
      const info: ReqHttpErrInfo = { message: args, statusCode: 500 };
      super(info);
      this.info = info;
    } else {
      super(args);
      this.info = {
        ...args,
        statusCode: args.statusCode ? args.statusCode : 500
      };
    }
  }
}

export type IssuerExceptionInfo = {
  /**  */
  code: IECode;
  /** Message for client */
  msg?: string;
  /** Description for logs */
  desc?: string;
  cause?: Error;
}

export class IssuerException extends IssuerExceptionOrigin {
  readonly msg: IssuerExceptionInfo["msg"];
  readonly desc: IssuerExceptionInfo["desc"];
  override readonly cause: IssuerExceptionInfo["cause"];
  constructor({
    code,
    msg,
    desc,
    cause
  }: IssuerExceptionInfo) {
    super(code, msg);
    this.msg = msg;
    this.cause = cause;
    this.desc = desc;
  }
}

