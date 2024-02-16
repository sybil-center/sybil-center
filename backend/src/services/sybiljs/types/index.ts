export const SYBIL_CREDENTIAL_TYPES = ["passport"] as const;

export type CredentialType = typeof SYBIL_CREDENTIAL_TYPES[number];

export function isCredentialType(type: string): type is CredentialType {
  return SYBIL_CREDENTIAL_TYPES
    // @ts-expect-error
    .includes(type);
}
