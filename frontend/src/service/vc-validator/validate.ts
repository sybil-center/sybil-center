import { Credential } from "@sybil-center/sdk";
import KeyResolver from "key-did-resolver";
import { DID } from "dids";
import { toFullJWT } from "../../util/jwt";

export async function validateVC(vcStr: string): Promise<boolean> {
  try {
    const vc = JSON.parse(vcStr) as Credential;
    const detachedJWS = vc.proof?.jws;
    if (!detachedJWS) {
      return false;
    }
    vc.proof = undefined;
    const fullJWS = toFullJWT(detachedJWS, vc);
    const resolver = KeyResolver.getResolver();
    const did = new DID({ resolver: resolver });
    await did.verifyJWS(fullJWS);
    return true;
  } catch (e) {
    return false;
  }
}
