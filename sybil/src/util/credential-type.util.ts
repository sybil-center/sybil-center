import { CredentialType, credentialTypes } from "../types/index.js";

export function urlCredentialType(credentialType: CredentialType): string {
  return credentialType
    .toString()
    .replace(/([a-z0–9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function toCredentialType(credentialTypeUrl: string): CredentialType {
  const type =  credentialTypeUrl.replace(/(^\w|-\w)/g, clearAndUpper) as CredentialType;
  if (isCredentialType(type)) {
    return type as CredentialType;
  }
  throw new Error(`can not convert ${credentialTypeUrl} to CredentialType enum`);
}

function clearAndUpper(text: string) {
  return text.replace(/-/, "").toUpperCase();
}

function isCredentialType(type: CredentialType): type is CredentialType {
  return credentialTypes.includes(type);
}
