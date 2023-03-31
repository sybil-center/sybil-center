import * as t from "io-ts";
import { fromString, toString } from "uint8arrays";

/**
 * Represent Uint8Array bytes as base64url-encoded string
 */
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

/**
 * Represent JSON as Uint8Array bytes
 */
export const jsonAsBytes = new t.Type<any, Uint8Array, Uint8Array>(
  "JSON-as-Uint8Array",
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
