import { IVerifier, SignEntry } from "../../types/verifier.js";
import { MinaVerifier } from "./mina-verifier.service.js";
import { ClientError } from "../../../backbone/errors.js";
import { ZkcIdAlias } from "../../types/zkc.issuer.js";
import { zkc } from "../../../util/zk-credentials.util.js";

/** Manage Signature Verifiers */
export interface IVerifierManager {
  /**
   * Returns verifier by its alias
   * @param alias
   */
  verifier(alias: string | number): IVerifier;
  /**
   *  Verify signature by alias and sign entry
   * @param alias
   * @param signEntry
   */
  verify(alias: string | number, signEntry: SignEntry): Promise<boolean>;
}

export class VerifierManager implements IVerifierManager {

  private readonly verifiers: Record<ZkcIdAlias, IVerifier>;

  constructor() {
    const minaVerifier = new MinaVerifier();
    this.verifiers = {
      "mina": minaVerifier,
      1: minaVerifier
    };
  }

  verifier(alias: string | number): IVerifier {
    const isAlias = zkc.isIdAlias(alias);
    if (!isAlias) throw new ClientError(`Chain namespace ${alias} is not supported`);
    return this.verifiers[alias];

  }

  verify(alias: string | number, entry: SignEntry): Promise<boolean> {
    const verifier = this.verifier(alias);
    return verifier.verify(entry);
  }

}
