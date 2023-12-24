import { IACIProver } from "./type.js";
import { ACIProofType, TrSchema, ZACIProof, ZAttributes } from "@zcredjs/core";
import { O1TrGraph } from "o1js-trgraph";
import sortKeys from "sort-keys";
import { Field, Poseidon } from "o1js";

const trGraph = new O1TrGraph();

export class ACIMinaPoseidonProver implements IACIProver {
  get proofType(): ACIProofType { return "aci:mina-poseidon";}
  async createProof<
    TAttr extends ZAttributes = ZAttributes
  >(attributes: TAttr, transSchema: TrSchema
  ): Promise<ZACIProof> {
    const sortedSchema = sortKeys(transSchema, { deep: true });
    const { linear } = trGraph.objectTransform<{}, Field[]>(attributes, sortedSchema);
    const hash = Poseidon.hash(linear);
    const aci = trGraph.transform<string>(
      hash.toBigInt(),
      ["uint256-bytes", "bytes-base58"]
    );
    return {
      type: this.proofType,
      aci: aci,
      schema: {
        attributes: sortedSchema,
        aci: ["base58-bytes", "bytes-uint256", "uint256-mina:field"],
        type: ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
      }
    };
  }
}
