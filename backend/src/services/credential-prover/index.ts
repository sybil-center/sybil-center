import { Config } from "../../backbone/config.js";
import { ACIProofType, SignProofType, TrSchema, ZACIProof, ZAttributes, ZSignatureProof } from "@zcredjs/core";
import { IACIProver, ICredentialSignProver } from "./type.js";
import { tokens } from "typed-inject";
import { MinaPoseidonPastaSignProver } from "./mina-poseidon-pasta.js";
import { ServerErr } from "../../backbone/errors.js";
import { ACIMinaPoseidonProver } from "./aci-mina-poseidon.js";

type SignAttrEntry<
  TAttr extends ZAttributes = ZAttributes
> = {
  attributes: TAttr,
  transSchema: TrSchema
}

type ACIEntry<
  TAttr extends ZAttributes = ZAttributes
> = {
  attributes: TAttr,
  transSchema: TrSchema
}

export class CredentialProver {

  private readonly signProvers: Record<SignProofType, ICredentialSignProver>;
  private readonly aciProvers: Record<ACIProofType, IACIProver>;

  static inject = tokens(
    "config"
  );
  constructor(
    config: Config
  ) {
    this.signProvers = {
      "mina:poseidon-pasta": new MinaPoseidonPastaSignProver(config)
    };
    this.aciProvers = {
      "aci:mina-poseidon": new ACIMinaPoseidonProver()
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
    TAttr extends ZAttributes = ZAttributes
  >(proofType: SignProofType, {
    attributes,
    transSchema
  }: SignAttrEntry<TAttr>): Promise<ZSignatureProof> {
    return this.signProver(proofType).signAttributes(attributes, transSchema);
  }

  aciProver<
    T extends ACIProofType = ACIProofType
  >(proofType: T): IACIProver {
    const prover = this.aciProvers[proofType];
    if (prover) return prover;
    throw new ServerErr({
      message: "Internal server error",
      place: this.constructor.name,
      description: `${this.constructor.name} does not support aci proof type ${proofType}`
    });
  }

  createACIProof<
    T extends ACIProofType = ACIProofType
  >(proofType: T, {
    attributes,
    transSchema
  }: ACIEntry): Promise<ZACIProof> {
    return this.aciProver(proofType).createProof(attributes, transSchema);
  }
}
