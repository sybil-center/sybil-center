import { toFullJWT } from "./jwt.js";
import KeyResolver from "key-did-resolver";
import { DID } from "dids";
import { Credential } from "@sybil-center/sdk/types";

export async function isValidVC(credential: Credential): Promise<boolean> {
  try {
    const { proof } = credential;
    if (!proof) throw new Error("VC proof value is undefined");
    const { jws: detachedJWS } = proof;
    if (!detachedJWS) throw new Error("VC proof jws is undefined");
    // @ts-ignore
    credential.proof = undefined;
    const fullJWS = toFullJWT(detachedJWS, credential);
    const resolver = KeyResolver.getResolver();
    await new DID({ resolver: resolver }).verifyJWS(fullJWS);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
