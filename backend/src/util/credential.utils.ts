import { toFullJWT } from "./jwt.util.js";
import KeyResolver from "key-did-resolver";
import { DID } from "dids";
import { Credential } from "@sybil-center/sdk/types";
import { CredentialType } from "@sybil-center/sdk";

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

export type CredentialOptions = {
  ttlRange?: number; // range between issuance date and expiration date
  type: CredentialType;
  reqExpDate?: boolean; // require expiration date
}

type ValidateResult = {
  valid: boolean;
  reason?: string; // if valid === false
}

function validate(credential: Credential, options: CredentialOptions): ValidateResult {
  if (!credential.type.includes(options.type)) return {
    valid: false,
    reason: `Credential must have '${options.type}' type`
  };
  if (options.reqExpDate && !credential.expirationDate) return {
    valid: false,
    reason: `Credential must has 'expirationDate'`
  };
  if (options.ttlRange) {
    const expirationDate = credential.expirationDate?.getTime();
    const issuanceDate = credential.issuanceDate.getTime();
    if (!expirationDate) return {
      valid: false,
      reason: `Credential must has 'expirationDate'`
    };
    if (expirationDate - issuanceDate > options.ttlRange) return {
      valid: false,
      reason: `Credential TTL must be less then ${options.ttlRange} MS`
    };
  }
  return { valid: true };
}

function extractAccountId(credential: Credential): string {
  return credential!.credentialSubject!.id.split(":").slice(2).join("")
}

export const credentialUtil = {
  validate: validate,
  extractAccountId: extractAccountId
};
