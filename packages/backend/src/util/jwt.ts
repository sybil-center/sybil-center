import { DagJWS, JWSSignature } from "dids";
import * as uint8arrays from "uint8arrays";

export function toJWTPayload(obj: Object): string {
  const bytes = uint8arrays.fromString(JSON.stringify(obj));
  return uint8arrays.toString(bytes, "base64url");
}

export function toFullJWT(detachedJWT: string, payloadObj: Object): string {
  const [header, _, signature] = detachedJWT.split(".");
  const payload = toJWTPayload(payloadObj);
  return `${header}.${payload}.${signature}`;
}

export function toFullDagJWT(detachedJWT: string, payloadObj: Object): DagJWS {
  const [header, _, signature] = detachedJWT.split(".");
  if (!header) throw new Error(`Can not get header`);
  if (!signature) throw new Error(`Can not get signature`);
  const payload = toJWTPayload(payloadObj);

  return {
    payload: payload,
    signatures: [{ protected: header, signature: signature }],
  };
}

export function toDagJWS(jws: string): DagJWS {
  const jwsInfo = jws.split(".");
  const [jwsHeader, jwsPayload, jwsSignature] = jwsInfo;
  if (!(jwsHeader && jwsPayload && jwsSignature)) throw new Error(`Can not parse JWS`);

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
  if (!jwsSignature) throw new Error(`Can not parse jws-signature`);

  const signature = jwsSignature.signature;
  const header = jwsSignature.protected;

  return `${header}.${payload}.${signature}`;
}

export function toDetachedJWS(dagJWS: DagJWS): string {
  const [jwsSignature] = dagJWS.signatures;
  if (!jwsSignature) throw new Error(`Can not parse jws-signature`);

  const signature = jwsSignature.signature;
  const header = jwsSignature.protected;

  return `${header}..${signature}`;
}

export function getPayload(jwt: string): string {
  const payloadSection = jwt.split(".")[1];
  if (!payloadSection) throw new Error(`Can not parse jws-signature`);
  const bytes = uint8arrays.fromString(payloadSection, "base64url");
  return uint8arrays.toString(bytes);
}
