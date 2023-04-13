export class ClientError extends Error {
  readonly statusCode;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode ? statusCode : 400;
  }
}

export class ServerError extends Error {
  readonly statusCode = 500;
  readonly _place: string;
  readonly _log: string;
  constructor(message: string, params: { props: Partial<{ _place: string; _log: string }> }) {
    super(message);
    const props = { _place: "Application", _log: "", ...params.props };
    this._place = props._place;
    this._log = props._log;
  }
}
