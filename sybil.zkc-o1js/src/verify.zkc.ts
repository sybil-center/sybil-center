import { Selector, ZkCred } from "@sybil-center/zkc-core";
import { o1jsPreparator } from "./preparator.js";
import { Field, Poseidon, PublicKey, Signature } from "o1js";

type PreparedSign = [Signature, Field, PublicKey];

export async function verify<
  TCred extends ZkCred = ZkCred
>(
  args: {
    cred: TCred,
    attributeSelector?: Selector
    signSelector?: Selector
  }
): Promise<boolean> {
  const {
    cred,
    attributeSelector,
    signSelector
  } = args;
  try {
    const preparedAttr = o1jsPreparator.getPreparedAttributes<Field[]>(cred, attributeSelector);
    const [
      sign,
      _,
      isr_id_k
    ] = o1jsPreparator.getPreparedSign<PreparedSign>(
      cred,
      signSelector ? signSelector : attributeSelector
    );
    const hash = Poseidon.hash(preparedAttr);
    return sign.verify(isr_id_k, [hash]).toBoolean();
  } catch (e) {
    return false;
  }
}
