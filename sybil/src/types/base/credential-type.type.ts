/**
 * Provided types of VC
 * Can be converted to Kebab case and turn over by {@link urlCredentialType} and {@link toCredentialType}
 */
export type CredentialType =
  | "VerifiableCredential"
  | "Empty"
  | "EthereumAddressExists"
  | "EthereumAccount"
  | "TwitterAccount"
  | "GitHubAccount"
  | "DiscordAccount"

