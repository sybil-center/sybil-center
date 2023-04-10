import { toFullJWT } from "./jwt.util.js";
import KeyResolver from "key-did-resolver";
import { DID } from "dids";
import { Credential } from "@sybil-center/sdk/types";

export async function isValidVC(credential: Credential): Promise<boolean> {
  try {
    const credentialCopy = JSON.parse(JSON.stringify(credential));
    const { proof } = credentialCopy;
    if (!proof) return false;
    const { jws: detachedJWS } = proof;
    if (!detachedJWS) return false;
    // @ts-ignore
    credentialCopy.proof = undefined;
    const fullJWS = toFullJWT(detachedJWS, credentialCopy);
    const resolver = KeyResolver.getResolver();
    await new DID({ resolver: resolver }).verifyJWS(fullJWS);
    return true;
  } catch (e) {
    return false;
  }
}
