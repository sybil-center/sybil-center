import { SignService } from "../abstraction/sign.service.js";
import base58 from "bs58";
import * as ed25519 from "@noble/ed25519";

/**
 * @param signature as uint8 array
 * @param message as utf-8 string
 * @param address base58 address
 */
export async function verifySolanaSign(
  signature: Uint8Array,
  message: string,
  address: string
): Promise<boolean> {
  try {
    const publicKey = base58.decode(address);
    const msg = new Uint8Array(Buffer.from(message, "utf-8"));
    return await ed25519.verify(signature, msg, publicKey);
  } catch (e) {
    return false;
  }
}

export class SolanaSignService extends SignService {
  readonly didPrefix = `did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ`;
  protected readonly verifyFun = verifySolanaSign;
}
