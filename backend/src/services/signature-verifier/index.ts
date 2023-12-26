import { IdType } from "@zcredjs/core";
import { ISignatureVerifier, SignEntry, SignOptions } from "./type.js";
import { MinaSignatureVerifier } from "./mina-verifier.js";
import { ClientErr } from "../../backbone/errors.js";
import { EthereumSignatureVerifier } from "./ethereum-verifier.js";

type VerifyEntry = SignEntry & {
  options: SignOptions
};

export class SignatureVerifier {

  private readonly verifiers: Record<IdType, ISignatureVerifier> = {
    "mina:publickey": new MinaSignatureVerifier(),
    "ethereum:address": new EthereumSignatureVerifier()
  };

  verifier(idType: string) {
    const verifier = this.verifiers[idType as IdType];
    if (verifier) return verifier;
    throw new ClientErr(`Signatures from ${idType} is not supported`);
  }

  verify(idType: string, { signature, message, publickey, options }: VerifyEntry) {
    return this.verifier(idType).verify({
      signature,
      message,
      publickey
    }, options);
  }
}
