import { ICredentialSignProver } from "./type.js";
import * as o1js from "o1js";
import { type Attributes, type SignatureProof, type TrSchema } from "@zcredjs/core";
import { MinaPoseidonPastaProver } from "@zcredjs/mina";

export class MinaPoseidonPastaSignatureProver implements ICredentialSignProver {

  private readonly prover: MinaPoseidonPastaProver;

  constructor(
    config: { minaPrivateKey: string }
  ) {
    this.prover = new MinaPoseidonPastaProver(o1js, config.minaPrivateKey);
  }

  get issuerId() { return this.prover.issuerId;}
  get proofType() {return this.prover.proofType;}
  get issuerReference() {return `${this.issuerId.type}:${this.issuerId.key}`;}

  async signAttributes<
    TAttr extends Attributes = Attributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<SignatureProof> {
    return await this.prover.signAttributes(attributes, transSchema);
  }

}
