import * as t from "io-ts";
import { fromString, toString } from "uint8arrays";
import { DagJWS } from "dids";
import { DecodedJWS } from "../jws.js";

/** Represent Uint8Array bytes as base64url-encoded string */
export const bytesAsB64U = new t.Type<Uint8Array, string, string>(
  "Uint8Array-as-base64url",
  (input: unknown): input is Uint8Array => input instanceof Uint8Array,
  (input, context) => {
    try {
      return t.success(fromString(input, "base64url"));
    } catch (e: any) {
      return t.failure(input, context, e.message);
    }
  },
  (bytes) => {
    return toString(bytes, "base64url");
  }
);

/** Represent JSON as Uint8Array bytes */
export const jsonAsBytes = new t.Type<any, Uint8Array, Uint8Array>(
  "JSON-as-Uint8Array",
  // @ts-ignore
  (input: unknown): input is any => true,
  (input, context) => {
    try {
      return t.success(JSON.parse(toString(input)));
    } catch (e) {
      return t.failure(input, context, String(e));
    }
  },
  (json) => {
    return fromString(JSON.stringify(json));
  }
);

export const jsonAsString = new t.Type<any, string, string>(
  "JSON-as-UTF8",
  // @ts-ignore
  (input: unknown): input is any => true,
  (input, context) => {
    try {
      return t.success(JSON.parse(input));
    } catch (e) {
      return t.failure(input, context, String(e));
    }
  },
  (json) => JSON.stringify(json)
);

export const jwsAsDagJWS = new t.Type<DagJWS, string, string>(
  "JWS-as-DagJWS",
  (runtime: any): runtime is DagJWS => {
    if (!runtime.payload) return false;
    if (!runtime.signatures) return false;
    const signature = runtime.signatures[0];
    if (!signature) return false;
    if (!signature.protected) return false;
    return signature.signature;
  },
  (input, context) => {
    try {
      const [header, payload, signature] = input.split(".");
      if (!header || !payload || !signature) {
        return t.failure(input, context, "Incorect jws");
      }
      return t.success({
        payload: payload,
        signatures: [{ protected: header, signature: signature }]
      });
    } catch (e) {
      return t.failure(input, context, "Incorect jws");
    }
  },
  (dagJWS: DagJWS) => {
    const header = dagJWS.signatures[0]!.protected;
    const signature = dagJWS.signatures[0]!.signature;
    const payload = dagJWS.payload;
    return `${header}.${payload}.${signature}`;
  }
);

export const dagJWSAsEncodedJWS = new t.Type<DecodedJWS, DagJWS, DagJWS>(
  "DagJWS-as-EncodedJWS",
  (input: any): input is DecodedJWS => {
    return input !== null ||
      typeof input === "object" ||
      input.header !== null ||
      typeof input.header === "object" ||
      input.payload !== null ||
      typeof input.payload === "object" ||
      typeof input.signature === "string";
  },
  (dagJWS: DagJWS, context) => {
    try {
      if (!dagJWS.signatures) {
        return t.failure(dagJWS, context, "DagJws signature is empty");
      }
      const dHeader = dagJWS.signatures[0]?.protected;
      if (!dHeader) {
        return t.failure(dagJWS, context, "DagJWS header is empty");
      }
      const signature = dagJWS.signatures[0]?.signature;
      if (!signature) {
        return t.failure(dagJWS, context, "DagJWS signature is empty");
      }
      const payload = JSON.parse(toString(fromString(dagJWS.payload, "base64url"), "utf-8"));
      const header = JSON.parse(toString(fromString(dHeader, "base64url"), "utf-8"));
      const decoded: DecodedJWS = {
        header: header,
        payload: payload,
        signature: signature
      };
      return t.success(decoded);
    } catch (e) {
      return t.failure(dagJWS, context, String(e));
    }
  },
  (decodedJWS: DecodedJWS) => {
    const header = toString(
      fromString(JSON.stringify(decodedJWS.header), "utf-8"),
      "base64url"
    );
    const payload = toString(
      fromString(JSON.stringify(decodedJWS.payload), "utf-8"),
      "base64url"
    );
    return {
      payload: payload,
      signatures: [
        {
          signature: decodedJWS.signature,
          protected: header
        }
      ]
    };
  }
);

export const jwsAsDecodedJWS = t.string
  .pipe(jwsAsDagJWS)
  .pipe(dagJWSAsEncodedJWS);


