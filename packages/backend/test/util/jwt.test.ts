import { suite } from "uvu";
import * as assert from "uvu/assert";
import {
  getPayload,
  toDagJWS,
  toDetachedJWS,
  toFullDagJWT,
  toFullJWT,
  toJWS,
} from "../../src/util/jwt.js";
import { DagJWS } from "dids/dist/types";

const test = suite("JWT lib util test");

const jws =
  "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9" +
  ".eyJAY29udGV4dCI6WyJ0ZXN0Il0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoidGVzdFN1YmplY3RJZCJ9LCJpZCI6InRlc3RJZCIsImlzc3VhbmNlRGF0ZSI6IjIwMjMtMDEtMThUMjA6MDk6MTkuMTU3WiIsImlzc3VlciI6Imlzc3VlciIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJFbXB0eUNyZWRlbnRpYWwiXX0" +
  ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const dagJWS: DagJWS = {
  payload:
    "eyJAY29udGV4dCI6WyJ0ZXN0Il0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImlkIjoidGVzdFN1YmplY3RJZCJ9LCJpZCI6InRlc3RJZCIsImlzc3VhbmNlRGF0ZSI6IjIwMjMtMDEtMThUMjA6MDk6MTkuMTU3WiIsImlzc3VlciI6Imlzc3VlciIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJFbXB0eUNyZWRlbnRpYWwiXX0",
  signatures: [
    {
      signature: "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      protected:
        "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9",
    },
  ],
};

const detachedJWS =
  "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9" +
  "..SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

const payload = {
  "@context": ["test"],
  credentialSubject: {
    id: "testSubjectId",
  },
  id: "testId",
  issuanceDate: "2023-01-18T20:09:19.157Z",
  issuer: "issuer",
  type: ["VerifiableCredential", "EmptyCredential"],
};

test("should get payload", async () => {
  const payloadFromJWS = getPayload(jws);
  assert.is(payloadFromJWS, JSON.stringify(payload));
});

test("should convert detached jws to full jws", async () => {
  const fullJWS = toFullJWT(detachedJWS, payload);
  assert.is(fullJWS, jws);
});

test("should convert jws as string to dag jws", async () => {
  const dagJWSFromStrJws = toDagJWS(jws);
  assert.type(dagJWSFromStrJws, "object");
  assert.ok(dagJWSFromStrJws.payload, "payload is undefined");
  assert.ok(dagJWSFromStrJws.signatures, "signatures is undefined");
  const signature = dagJWSFromStrJws.signatures[0];
  assert.ok(signature.signature, "signature is undefined");
  assert.ok(signature.protected, "protected is undefined");
});

test("should convert dag jws to jws string", async () => {
  const jwsFromDag = toJWS(dagJWS);
  assert.is(jwsFromDag, jws);
});

test("should convert dag jws to detached jws", async () => {
  const detachedJWSFromDag = toDetachedJWS(dagJWS);
  assert.is(detachedJWSFromDag, detachedJWS);
});

test("should convert detached jws and payload to full dag jws", async () => {
  const dagJWSFromDetachedJWS = toFullDagJWT(detachedJWS, payload);
  assert.type(dagJWSFromDetachedJWS, "object");
  assert.ok(dagJWSFromDetachedJWS.payload, "payload is undefined");
  assert.ok(dagJWSFromDetachedJWS.signatures, "signatures is undefined");
  const signature = dagJWSFromDetachedJWS.signatures[0];
  assert.ok(signature.signature, "signature is undefined");
  assert.ok(signature.protected, "protected is undefined");
});

test.run();
