import { CredentialType } from "../types/index.js";

export function urlCredentialType(credentialType: CredentialType): string {
  return credentialType
    .toString()
    .replace(/([a-z0–9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function toCredentialType(credentialTypeUrl: string): CredentialType {
  const vcTypeStr = credentialTypeUrl.replace(/(^\w|-\w)/g, clearAndUpper);
  // @ts-ignore
  const vcTypeEnum = CredentialType[vcTypeStr];
  if (vcTypeEnum) {
    return vcTypeEnum;
  }
  throw new Error(`can not convert ${credentialTypeUrl} to VCType enum`);
}

function clearAndUpper(text: string) {
  return text.replace(/-/, "").toUpperCase();
}
