import { Config } from "../../backbone/config.js";
import {  type Attributes, type SignProofType, TrSchema, type SignatureProof } from "@zcredjs/core";
import { tokens } from "typed-inject";
import { MinaPoseidonPastaSignatureProver } from "./mina-poseidon-pasta.js";
import { ServerErr } from "../../backbone/errors.js";
import { ICredentialSignProver } from "./type.js";

type SignAttrEntry<
  TAttr extends Attributes = Attributes
> = {
  attributes: TAttr,
  transSchema: TrSchema
}

export class CredentialProver {

  private readonly signProvers: Record<SignProofType, ICredentialSignProver>;

  static inject = tokens(
    "config"
  );
  constructor(
    config: Config
  ) {
    this.signProvers = {
      "mina:poseidon-pasta": new MinaPoseidonPastaSignatureProver(config)
    };
  }

  signProver<
    T extends SignProofType = SignProofType
  >(proofType: T): ICredentialSignProver {
    const prover = this.signProvers[proofType as SignProofType];
    if (prover) return prover;
    throw new ServerErr({
      message: "Internal server error",
      place: this.constructor.name,
      description: `${this.constructor.name} does not support signature proof type ${proofType}`
    });
  }

  signAttributes<
    TAttr extends Attributes = Attributes
  >(proofType: SignProofType, {
    attributes,
    transSchema
  }: SignAttrEntry<TAttr>): Promise<SignatureProof> {
    return this.signProver(proofType).signAttributes(attributes, transSchema);
  }
}
