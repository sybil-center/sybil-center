export * from "./mina.wallet-provider.js";
export * from "./preparator.js";
export * from "@sybil-center/zkc-core";

import { verify } from "./verify.zkc.js";
import { o1jsPreparator } from "./preparator.js";

export const o1jsZKC = {
  preparator: o1jsPreparator,
  verifyCred: verify,
};
