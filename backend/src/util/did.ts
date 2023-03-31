import { hash } from "@stablelib/sha256";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { DID } from "dids";
import KeyResolver from "key-did-resolver";

/**
 * Create DID with key method. "did:key:..."
 * @param secret use to create DID
 */
export async function createDIDKey(secret: string): Promise<DID> {
  const secretBytes = Array.from(secret, (i) => i.charCodeAt(0));
  const seed = hash(new Uint8Array(secretBytes));

  const provider = new Ed25519Provider(seed);
  const did = new DID({
    provider: provider,
    resolver: KeyResolver.getResolver(),
  });
  await did.authenticate();

  return did;
}

export async function getVerificationMethodDIDKey(did: DID): Promise<string> {
  const { didDocument } = await did.resolve(did.id);
  return didDocument?.verificationMethod?.pop()?.id!;
}

/**
 * returns did:pkh:eip155:1:{ethereum address} from ethereum address
 * {@see https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md}
 */
export function getEthDidPkh(ethAddress: string) {
  return `did:pkh:eip155:1:${ethAddress}`;
}
