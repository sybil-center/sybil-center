/**
 * Provided types of VC
 * Can be converted to Kebab case and turn over by {@link urlCredentialType} and {@link toCredentialType}
 */
export const credentialTypes = [
  "VerifiableCredential",
  "Empty",
  "EthereumAddressExists",
  "EthereumAccount",
  "TwitterAccount",
  "GitHubAccount",
  "DiscordAccount"
] as const

export type CredentialType = typeof credentialTypes[number]

