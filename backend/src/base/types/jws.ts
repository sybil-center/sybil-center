import { AnyObj } from "../../util/model.util.js";

export type DecodedJWS = {
  header: {
    alg?: string;
    kid?: string;
  },
  payload: AnyObj,
  signature: string;
}


