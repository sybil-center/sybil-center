import { App } from "../../../src/app/app.js";
import * as a from "uvu/assert";
import { VCCredential } from "../../../src/services/vc/consts/vc-credential.js";
import { ThrowDecoder } from "../../../src/util/throw-decoder.util.js";

type Input<T extends VCCredential = VCCredential> = {
  credential: T,
  app: App,
  shouldVerified?: boolean
}

export async function verifyCredential<T extends VCCredential>(input: Input<T>) {
  if (input.shouldVerified === undefined) input.shouldVerified = true;
  const verifier = input.app.context.resolve("vcCredentialVerifier");
  const { isVerified } = await verifier.verify(ThrowDecoder.decode(VCCredential, input.credential));
  a.is(isVerified, input.shouldVerified, "not expected credential verification result");
}
