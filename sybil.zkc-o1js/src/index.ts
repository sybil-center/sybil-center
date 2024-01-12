import { type Preparator } from "@sybil-center/zkc-core";
import { verify } from "./verify.zkc.js";
import { o1jsPreparator } from "./preparator.js";

export * from "./auro.wallet-provider.js";
export * from "./preparator.js";
export * from "@sybil-center/zkc-core";

export const o1jsSybil = {
  getPreparator<T extends Preparator = Preparator>(): T { return o1jsPreparator as T; },
  verifyCred: verify,
};
