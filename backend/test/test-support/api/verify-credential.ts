import { App } from "../../../src/app/app.js";
import * as a from "uvu/assert";
import { verifyCredentialEP } from "@sybil-center/sdk/util";
import { VerifyResult } from "@sybil-center/sdk/types";

export async function verifyCredential<T extends Credential>(
  credential: T,
  app: App,
  shouldVerified = true
) {
  const fastify = app.context.resolve("httpServer").fastify;
  const verifyResp = await fastify.inject({
    method: "POST",
    url: verifyCredentialEP(),
    payload: {
      ...credential
    }
  });
  a.is(verifyResp.statusCode, 200, `verify response fail. error: ${verifyResp.body}`);
  const { isVerified } = JSON.parse(verifyResp.body) as VerifyResult;
  a.is(isVerified, shouldVerified, "not expected credential verification result");
}
