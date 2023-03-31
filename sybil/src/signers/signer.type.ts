import type { SignFn } from "../types/index.js";

export interface ISigner {
  sign: SignFn;
}
