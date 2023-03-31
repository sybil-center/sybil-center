/**
 * Provided types of VC
 * Can be converted to Kebab case and turn over by {@link toUrlVCType} and {@link toEnumVCType}
 */
export enum VCType {
  VerifiableCredential = "VerifiableCredential",
  Empty = "Empty",
  EthereumAddressExists = "EthereumAddressExists",
  EthereumAccount = "EthereumAccount",
  TwitterAccount = "TwitterAccount",
  GitHubAccount = "GitHubAccount",
  DiscordAccount = "DiscordAccount"
}

export function toUrlVCType(vcType: VCType): string {
  return vcType
    .toString()
    .replace(/([a-z0–9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export function toEnumVCType(vcTypeUrl: string): VCType {
  const vcTypeStr = vcTypeUrl.replace(/(^\w|-\w)/g, clearAndUpper);
  // @ts-ignore
  const vcTypeEnum = VCType[vcTypeStr];
  if (vcTypeEnum) {
    return vcTypeEnum;
  }
  throw new Error(`can not convert ${vcTypeUrl} to VCType enum`);
}

function clearAndUpper(text: string) {
  return text.replace(/-/, "").toUpperCase();
}
