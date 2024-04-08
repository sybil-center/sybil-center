import { toJWTPayload } from "../../../src/util/jwt.util.js";
import sortKeys from "sort-keys";
import { HttpCredential } from "@zcredjs/core";
import {DID} from "dids"
import KeyResolver from "key-did-resolver";

const did = new DID({
  resolver: KeyResolver.getResolver(),
});

export async function verifyCredJWS(cred: HttpCredential): Promise<boolean> {
  try {
    const credentialCopy = sortKeys(JSON.parse(JSON.stringify(cred)), { deep: true });
    credentialCopy.protection = undefined;
    const jwsPayload = toJWTPayload(credentialCopy);
    const [jwsHeader, _, jwsSignature] = cred.protection.jws.split(".");
    await did.verifyJWS(`${jwsHeader}.${jwsPayload}.${jwsSignature}`);
    return true;
  } catch (e) {
    return false;
  }
}
