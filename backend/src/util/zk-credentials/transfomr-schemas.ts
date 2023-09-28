import { type TransCredSchema } from "@sybil-center/zkc-preparator";
import { ZkcSchemaNames, ZkcSchemaNums } from "../../base/types/zkc.credential.js";
import { ZkcIdTypeAlias } from "../../base/types/zkc.issuer.js";
import { Schema } from "./adapters.js";

class MinaSchemas implements Record<ZkcSchemaNames & ZkcSchemaNums, TransCredSchema> {
  get GitHubAccount() {
    return {
      isr: {
        id: {
          t: ["mina:uint64-field"],
          k: [
            "mina:base58-publickey",
            "mina:publickey-fields",
          ]
        }
      },
      sch: ["mina:uint64-field"],
      isd: ["mina:uint128-field"],
      exd: ["mina:uint128-field"],
      sbj: {
        id: {
          t: ["mina:uint64-field"],
          k: [
            "mina:base58-publickey",
            "mina:publickey-fields",
          ]
        },
        git: { id: ["mina:uint128-field.order", "mina:uint128-field"] }
      }
    };
  }
  get Passport() {
    return {
      isr: {
        id: {
          t: ["mina:uint64-field"],
          k: [
            "mina:base58-publickey",
            "mina:publickey-fields",
          ]
        }
      },
      sch: ["mina:uint64-field"],
      isd: ["mina:uint128-field"],
      exd: ["mina:uint128-field"],
      sbj: {
        id: {
          t: ["mina:uint64-field"],
          k: [
            "mina:base58-publickey",
            "mina:publickey-fields",
          ]
        },
        fn: [
          "utf8-bytes",
          "bytes-uint",
          "mina:uint-field.order",
          "mina:uint-field"
        ],
        ln: [
          "utf8-bytes",
          "bytes-uint",
          "mina:uint-field.order",
          "mina:uint-field"
        ],
        bd: [
          "mina:uint-field"
        ],
        cc: [
          "mina:uint32-field"
        ],
        doc: {
          t: [
            "mina:uint32-field"
          ],
          id: [
            "utf8-bytes",
            "bytes-uint",
            "mina:uint-field.order",
            "mina:uint-field"
          ]
        }
      }
    };
  };
  get 0() {
    return this[(Schema.toName(0))];
  }
  get 1() {
    return this[(Schema.toName(1))];
  };
}


class TransSchemas
  implements Record<
    ZkcIdTypeAlias,
    Record<ZkcSchemaNames & ZkcSchemaNums, TransCredSchema>
  > {
  readonly #MinaSchemas = new MinaSchemas();
  get mina() { return this.#MinaSchemas; }
  get 0() { return this.#MinaSchemas; }
}

const transSchemas = new TransSchemas();

export { transSchemas };
