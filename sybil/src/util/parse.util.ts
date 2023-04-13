import { Credential } from "../base/types/index.js";

type NameObj = {
  "credential": Credential
}

export function parse<TName extends keyof NameObj>(
  input: any,
  type: TName
): NameObj[TName] {
  switch (type) {
    case "credential":
      return parseCredential(input);
    default:
      throw new Error(`${type} is not supported`);
  }
}

function parseCredential(input: any): Credential {
  const credential = (typeof input === "string")
    ? JSON.parse(input)
    : input;
  credential.issuanceDate = new Date(credential.issuanceDate);
  credential.expirationDate = toDateIfPresent(credential.expirationDate);
  const proof = credential?.proof;
  if (proof) proof.created = toDateIfPresent(proof.created);
  return credential as Credential;
}


function toDateIfPresent(date: any): Date | undefined {
  return date ? new Date(date) : undefined;
}
