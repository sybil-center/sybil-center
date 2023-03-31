import { DagJWS, JWSSignature } from "dids/dist/types";
import base64url from "base64url";

export function toJWTPayload(obj: Object): string {
  return base64url(JSON.stringify(obj));
}

export function toFullJWT(detachedJWT: string, payloadObj: Object): string {
  const [header, , signature] = detachedJWT.split(".");
  const payload = toJWTPayload(payloadObj);
  return `${header}.${payload}.${signature}`;
}

export function toFullDagJWT(detachedJWT: string, payloadObj: Object): DagJWS {
  const [header, , signature] = detachedJWT.split(".");
  const payload = toJWTPayload(payloadObj);

  return {
    payload: payload,
    signatures: [{ protected: header, signature: signature }],
  };
}

export function toDagJWS(jws: string): DagJWS {
  const jwsInfo = jws.split(".");
  const [jwsHeader, jwsPayload, jwsSignature] = jwsInfo;

  const signature: JWSSignature = {
    protected: jwsHeader,
    signature: jwsSignature,
  };
  return {
    payload: jwsPayload,
    signatures: [signature],
  };
}

export function toJWS(dagJWS: DagJWS): string {
  const payload = dagJWS.payload;
  const [jwsSignature] = dagJWS.signatures;

  const signature = jwsSignature.signature;
  const header = jwsSignature.protected;

  return `${header}.${payload}.${signature}`;
}

export function toDetachedJWS(dagJWS: DagJWS): string {
  const [jwsSignature] = dagJWS.signatures;

  const signature = jwsSignature.signature;
  const header = jwsSignature.protected;

  return `${header}..${signature}`;
}

export function getPayload(jwt: string) {
  return base64url.decode(jwt.split(".")[1]);
}
