import { Config } from "../../../backbone/config.js";
import { tokens } from "typed-inject";
import { PROOF_TYPES, ProofType, SybilCred, SybilProof } from "@sybil-center/zkc-core";
import { IZKCSigner } from "../../types/zkc.signer.js";
import { MinaPoseidonPasta } from "./mina.poseidon-pasta.js";
import { ClientErr } from "../../../backbone/errors.js";
import { Sha256Secp256k1 } from "./sha256-secp256k1.js";

export class ZKCSignerManager {

  private readonly signers: Record<ProofType, IZKCSigner>;

  static inject = tokens(
    "config",
  );
  constructor(
    config: Config
  ) {
    this.signers = {
      "Mina:PoseidonPasta": new MinaPoseidonPasta(config),
      "Sha256Secp256k1": new Sha256Secp256k1(config)
    };
  }

  signer(proofType: ProofType): IZKCSigner {
    const signer = this.signers[proofType];
    if (signer) return signer;
    throw new ClientErr(`Proof type ${proofType} is not supported`);
  }

  signAttributes<
    TCred extends SybilCred = SybilCred
  >(args: {
    attributes: TCred["attributes"];
    proofType: ProofType;
  }): Promise<SybilProof> {
    return this.signer(args.proofType)
      .signAttributes({ attributes: args.attributes });
  }

  async proveZkCred<
    TCred extends SybilCred = SybilCred
  >(args: {
    attributes: TCred["attributes"];
    proofTypes?: ProofType[];
  }): Promise<Pick<TCred, "attributes" | "proofs">> {
    const provideTypes = args.proofTypes
      ? Array.from(new Set(args.proofTypes))
      : PROOF_TYPES;
    const proofs: SybilProof[] = [];
    for (const proofType of provideTypes) {
      const proof = await this.signAttributes({
        attributes: args.attributes,
        proofType: proofType
      });
      proofs.push(proof);
    }
    return {
      proofs: proofs,
      attributes: args.attributes
    };
  }
}
