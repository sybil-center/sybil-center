import { type AttributeSchema, Preparator, type Proof, type SignSchema, type ZkCred } from "zkc-core";
import { SybilSelector } from "./type/selector.js";


export class SybilPreparator extends Preparator {
  override getPreparedAttributes<
    TOut extends any[] = any[],
    TCred extends ZkCred = ZkCred
  >(cred: TCred, selector?: SybilSelector): TOut {
    return super.getPreparedAttributes(cred, selector);
  }

  override getPreparedSign<
    TOut extends any[] = any[],
    TCred extends ZkCred = ZkCred
  >(cred: TCred, selector?: SybilSelector): TOut {
    return super.getPreparedSign(cred, selector);
  }

  override selectProof(cred: ZkCred, selector?: SybilSelector): {
    proof: Proof;
    attributeSchema: AttributeSchema;
    signSchema: SignSchema;
  } {
    return super.selectProof(cred, selector);
  };
}
