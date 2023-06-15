import { suite } from "uvu";
import jwt from "jsonwebtoken";
import { fromString, toString } from "uint8arrays";
import * as a from "uvu/assert";

const test = suite("OTHER: JWT lib test");

test("should sign and validate JWT", async () => {
  const payload = { hello: "test" };
  const privatekey = "private";
  const token = jwt.sign(payload, privatekey);
  const [header, encodedPayload] = token.split(".");
  const jwtHeader = JSON.parse(toString(fromString(header!, "base64url"), "utf8")) as { alg: string, typ: string };
  const jwtPayload = JSON.parse(toString(fromString(encodedPayload!, "base64url"), "utf8")) as { hello: string };

  a.is(jwtHeader.typ, "JWT", "JWT header type not matched");
  a.is(jwtHeader.alg, "HS256", "JWT header alg not matched");
  a.is(jwtPayload.hello, payload.hello, "JWT payload not matched");

  const decodedPayload = jwt.verify(token, privatekey) as { hello: string };
  a.is(decodedPayload.hello, payload.hello, "payload not matched");
});

test.run();
