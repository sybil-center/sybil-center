import type { VC } from "../base/credentials.js";
import { toFullJWT } from "./jwt.js";
import KeyResolver from "key-did-resolver";
import { DID } from "dids";

export async function isValidVC(vc: VC): Promise<boolean> {
  try {
    const { proof } = vc;
    if (!proof) {
      throw new Error("VC proof value is undefined");
    }
    const { jws: detachedJWS } = proof;
    if (!detachedJWS) {
      throw new Error("VC proof jws is undefined");
    }
    // @ts-ignore
    vc.proof = undefined;
    const fullJWS = toFullJWT(detachedJWS, vc);
    const resolver = KeyResolver.getResolver();
    await new DID({ resolver: resolver }).verifyJWS(fullJWS);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}
