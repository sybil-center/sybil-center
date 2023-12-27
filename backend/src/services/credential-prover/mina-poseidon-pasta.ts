import { ICredentialSignProver } from "./type.js";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "o1js";
import {
  type SignProofType,
  type TrSchema,
  type ZAttributes,
  type ZIdentifier,
  type ZSignatureProof
} from "@zcredjs/core";
import { O1TrGraph } from "o1js-trgraph";
import sortKeys from "sort-keys";

export class MinaPoseidonPastaSignProver implements ICredentialSignProver {

  private readonly trGraph = new O1TrGraph();

  constructor(
    config: { minaPrivateKey: string },
    private readonly privateKey: PrivateKey = PrivateKey.fromBase58(config.minaPrivateKey),
    private readonly publicKey: PublicKey = privateKey.toPublicKey()
  ) {}

  get issuerId(): ZIdentifier {
    return {
      type: "mina:publickey",
      key: this.publicKey.toBase58()
    };
  };

  get proofType(): SignProofType { return "mina:poseidon-pasta"; };

  get issuerReference(): string {
    return `${this.issuerId.type}:${this.issuerId.key}`;
  }

  async signAttributes<
    TAttr extends ZAttributes = ZAttributes
  >(attributes: TAttr, transSchema: TrSchema): Promise<ZSignatureProof> {
    const sortedSchema = sortKeys(transSchema, { deep: true });
    const { linear } = this.trGraph.objectTransform<{}, Field[]>(attributes, sortedSchema);
    const hash = Poseidon.hash(linear);
    const signature = Signature.create(this.privateKey, [hash]);
    return {
      type: this.proofType,
      issuer: {
        id: this.issuerId
      },
      signature: signature.toBase58(),
      schema: {
        attributes: sortedSchema,
        type: ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
        signature: ["base58-mina:signature"],
        issuer: {
          id: {
            type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
            key: ["base58-mina:publickey"]
          }
        }
      }
    };
  }
}
