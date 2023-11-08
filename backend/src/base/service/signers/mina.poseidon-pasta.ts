import { Config } from "../../../backbone/config.js";
import { IDType, ProofType, SybilCred, SybilProof } from "@sybil-center/zkc-core";
import { Field, Poseidon, PrivateKey, PublicKey, Signature } from "snarkyjs";
import { ServerErr } from "../../../backbone/errors.js";
import { o1jsSybil } from "@sybil-center/zkc-o1js";
import { getTransformSchemas } from "../schemas.service.js";
import { IZKCSigner } from "../../types/zkc.signer.js";

export class MinaPoseidonPasta implements IZKCSigner {

  constructor(
    config: Config,
    private readonly privateKey: PrivateKey = PrivateKey.fromBase58(config.minaPrivateKey),
    private readonly publicKey: PublicKey = privateKey.toPublicKey()
  ) {}

  get proofType(): ProofType {
    return "Mina:PoseidonPasta";
  }

  get identifier(): { t: IDType, k: string } {
    return {
      t: 0,
      k: this.publicKey.toBase58()
    };
  }

  async signAttributes(args: {
    attributes: SybilCred["attributes"];
  }): Promise<SybilProof> {
    const attributes = args.attributes;
    const schemas = getTransformSchemas({
      attributes: attributes,
      proofType: this.proofType
    });
    return this._signAttributes({
      attributes: attributes,
      ...schemas
    });
  }

  private async _signAttributes(args: {
    attributes: SybilCred["attributes"],
    attributeSchemas: SybilProof["attributeSchemas"],
    signatureSchemas: SybilProof["signatureSchemas"]
  }): Promise<SybilProof> {
    const {
      attributes,
      attributeSchemas,
      signatureSchemas
    } = args;
    const attributeSchema = attributeSchemas.default;
    if (!attributeSchema) throw new ServerErr({
      message: "Internal server error",
      place: this.constructor.name,
      description: `Can not find attribute schema mina for attributes=${attributes}`,
    });
    const prepared = o1jsSybil.getPreparator().prepareAttributes<Field[]>({
      attributes: attributes,
      attributesSchema: attributeSchema
    });
    const hash = Poseidon.hash(prepared);
    const sign = Signature.create(this.privateKey, [hash]);
    return {
      type: this.proofType,
      signature: {
        isr: { id: this.identifier },
        sign: sign.toBase58()
      },
      signatureSchemas: signatureSchemas,
      attributeSchemas: attributeSchemas
    };
  }
}
