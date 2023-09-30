export * from "./mina.wallet-provider.js";
export * from "./preparator.js";
export * from "@sybil-center/zkc-core";

import { Proved, ZkCred, zkcUtil } from "@sybil-center/zkc-core";
import { verifyCred } from "./verify.zkc.js";
import { o1jsPreparator } from "./preparator.js";

export const zkcMina = {
  prepare<
    TOut extends any[] = any[],
    TCred extends Proved<ZkCred> = Proved<ZkCred>
  >(credential: TCred): TOut {
    const { cred, proof } = zkcUtil.from<TCred>(credential).credAndProof();
    return o1jsPreparator.prepare<TOut>(cred, proof.transformSchema);
  },
  verifyCred: verifyCred,
};
