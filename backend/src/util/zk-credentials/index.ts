import { IdType, Schema } from "./adapters.js";
import { preparator } from "./preparator.js";
import { EPs } from "./endpoints.js";
import { transSchemas } from "./transfomr-schemas.js";
import { ZkCredential } from "../../base/types/zkc.credential.js";
import sortKeys from "sort-keys";

export const Zkc = {
  schema: Schema,
  idType: IdType,
  EPs: EPs,
  preparator: preparator,
  transSchemas: transSchemas,
  sortCred<T extends (ZkCredential) = ZkCredential>(credential: T): T {
    const target: Record<string, any> = {};
    target.isr = {
      id: {
        t: credential.isr.id.t,
        k: credential.isr.id.k
      }
    };

    target.sch = credential.sch;
    target.isd = credential.isd;
    target.exd = credential.exd;

    const sbjProps = Object.keys(credential.sbj)
      .filter((key) => key !== "id")
      .reduce((sbjProps, prop) => {
        //@ts-ignore
        sbjProps[prop] = credential.sbj[prop];
        return sbjProps;
      }, {} as Record<string, any>);

    target.sbj = {
      id: {
        t: credential.sbj.id.t,
        k: credential.sbj.id.k
      },
      ...sortKeys(sbjProps, { deep: true })
    };
    return target as T;
  }
};
