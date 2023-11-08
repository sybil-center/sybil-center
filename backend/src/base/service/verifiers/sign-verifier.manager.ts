import { IDName, IDType, SybilChallengeReq, SybilID, toIdName } from "@sybil-center/zkc-core";
import { IVerifier, SignEntry } from "../../types/verifier.js";
import { MinaVerifier } from "./mina-verifier.service.js";
import { EthVerifier } from "./eth-verifier.service.js";
import { ClientErr } from "../../../backbone/errors.js";

export class SignVerifierManager {
  private readonly verifierMap: Map<IDName, IVerifier>;

  constructor() {
    const minaVerifier = new MinaVerifier();
    const ethereumVerifier = new EthVerifier();
    this.verifierMap = new Map<IDName, IVerifier>([
      ["MinaPublicKey", minaVerifier],
      ["EthereumAddress", ethereumVerifier]
    ]);
  }

  verifier(type: IDType): IVerifier {
    const verifier = this.verifierMap.get(toIdName(type));
    if (verifier) return verifier;
    throw new ClientErr(`Unsupported signature verifier for id type ${type}`);
  }

  async verify(args: {
    subjectId: SybilID,
    signEntry: Omit<SignEntry, "publickey">,
    options?: SybilChallengeReq["options"]
  }): Promise<boolean> {
    const {
      subjectId,
      signEntry,
      options
    } = args;
    return this.verifier(subjectId.t)
      .verify({
          ...signEntry,
          publickey: subjectId.k
        },
        options
      );
  }
}
