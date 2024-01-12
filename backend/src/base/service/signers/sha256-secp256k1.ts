import { IZKCSigner } from "../../types/zkc.signer.js";
import * as u8a from "uint8arrays";
import { ProofType, SybilCred, SybilID, SybilPreparator, SybilProof } from "@sybil-center/zkc-core";
import { getTransformSchemas } from "../schemas.service.js";
import { ServerErr } from "../../../backbone/errors.js";
import { sha256 } from "@noble/hashes/sha256";
import { secp256k1 } from "@noble/curves/secp256k1";


export class Sha256Secp256k1 implements IZKCSigner {

  constructor(
    config: { secp256k1PrivateKey: string },
    private readonly privateKey = u8a.fromString(config.secp256k1PrivateKey.toLowerCase(), "hex"),
    private readonly publicKey = secp256k1.getPublicKey(privateKey, false).slice(1, 65),
    private readonly preparator = new SybilPreparator()
  ) {}
  get identifier(): SybilID {
    return {
      t: 2,
      k: u8a.toString(this.publicKey, "hex")
    };
  };

  get proofType(): ProofType {
    return "Sha256Secp256k1";
  };

  async signAttributes<
    TAttr extends SybilCred["attributes"] = SybilCred["attributes"]
  >(args: { attributes: TAttr }): Promise<SybilProof> {
    const {
      attributes
    } = args;
    const {
      signatureSchemas,
      attributeSchemas
    } = getTransformSchemas({
      attributes: attributes,
      proofType: this.proofType
    });
    const attributeSchema = attributeSchemas.default;
    if (!attributeSchema) throw new ServerErr({
      message: "Internal server error",
      description: `Can not find attribute schema mina for attributes=${attributes}`,
      place: this.constructor.name
    });
    const preparedAttributes = this.preparator.prepareAttributes<number[]>({
      attributes: attributes,
      attributesSchema: attributeSchema
    });
    const hash = sha256(new Uint8Array(preparedAttributes));
    const signature = (await secp256k1.sign(hash, this.privateKey)).toCompactRawBytes();
    return {
      type: this.proofType,
      signature: {
        isr: { id: this.identifier },
        sign: u8a.toString(signature, "hex")
      },
      signatureSchemas: signatureSchemas,
      attributeSchemas: attributeSchemas
    };
  }


}
