export class ClientError extends Error {
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
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
