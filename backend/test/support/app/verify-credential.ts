import { App } from "../../../src/app/app.js";
import * as a from "uvu/assert";
import { Credential } from "../../../src/base/types/credential.js";
import { ThrowDecoder } from "../../../src/util/throw-decoder.util.js";

type Input<T extends Credential = Credential> = {
  credential: T,
  app: App,
  shouldVerified?: boolean
}

export async function verifyCredential<T extends Credential>(input: Input<T>) {
  if (input.shouldVerified === undefined) input.shouldVerified = true;
  const verifier = input.app.context.resolve("credentialVerifier");
  const { isVerified } = await verifier.verify(ThrowDecoder.decode(Credential, input.credential));
  a.is(isVerified, input.shouldVerified, "not expected credential verification result");
}
