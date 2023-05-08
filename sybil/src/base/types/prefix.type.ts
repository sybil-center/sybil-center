export type Prefix = typeof prefixList[number]

export const prefixList = [
  "bitcoin",
  "bip122:000000000019d6689c085ae165831e93",
  "did:pkh:bip122:000000000019d6689c085ae165831e93",
  "celo",
  "eip155:42220",
  "did:pkh:eip155:42220",
  "ethereum",
  "eip155:1",
  "did:pkh:eip155:1",
  "polygon",
  "eip155:137",
  "did:pkh:eip155:137",
  "solana",
  "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ",
  "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"
] as const;

export const mapPrefix = new Map<Prefix, Prefix>([
  ["bitcoin", "did:pkh:bip122:000000000019d6689c085ae165831e93"],
  ["bip122:000000000019d6689c085ae165831e93", "did:pkh:bip122:000000000019d6689c085ae165831e93"],
  ["did:pkh:bip122:000000000019d6689c085ae165831e93", "did:pkh:bip122:000000000019d6689c085ae165831e93"],

  ["celo", "did:pkh:eip155:42220"],
  ["eip155:42220", "did:pkh:eip155:42220"],
  ["did:pkh:eip155:42220", "did:pkh:eip155:42220"],

  ["ethereum", "did:pkh:eip155:1"],
  ["eip155:1", "did:pkh:eip155:1"],
  ["did:pkh:eip155:1", "did:pkh:eip155:1"],

  ["polygon", "did:pkh:eip155:137"],
  ["eip155:137", "did:pkh:eip155:137"],
  ["did:pkh:eip155:137", "did:pkh:eip155:137"],

  ["solana", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"],
  ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"],
  ["did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"]
]);
