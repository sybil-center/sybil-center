import { GraphLink, GraphNode, Preparator } from "@sybil-center/zkc-preparator";
import { Field, PublicKey } from "snarkyjs";
import { ZkCredential } from "../base/types/zkc.credential.js";
import sortKeys from "sort-keys";

const numTypes = [
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
];


const extendNodes: GraphNode[] = [
  {
    name: "mina:field",
    isType: (value: any) => value instanceof Field
  },
  {
    name: "mina:publickey",
    isType: (value: any) => value instanceof PublicKey
  },
];

function numsToField(): GraphLink[] {
  return numTypes.reduce((prev, name) => {
    prev.push({
      name: `mina:${name}-field`,
      inputType: `${name}`,
      outputType: "mina:field",
      transform: (value: number | bigint) => new Field(value)
    });
    return prev;
  }, [] as GraphLink[]);
}

function numsModMinaOrder(): GraphLink[] {
  return numTypes.reduce((prev, name) => {
    prev.push({
      name: `mina:${name}-field.order`,
      inputType: `${name}`,
      outputType: `${name}`,
      transform: (value: number | bigint) => {
        const num = typeof value === "number" ? BigInt(value) : value;
        return num % Field.ORDER;
      }
    });
    return prev;
  }, [] as GraphLink[]);
}

const extendLinks: GraphLink[] = [
  {
    name: "mina:base58-publickey",
    inputType: "base58",
    outputType: "mina:publickey",
    transform: (value: string) => PublicKey.fromBase58(value)
  },
  ...numsToField(),
  ...numsModMinaOrder()
];

const preparator = new Preparator();
preparator.extendGraph(extendNodes, extendLinks);

export const zkc = {
  prepare: preparator.prepare,
  sort<T extends (ZkCredential) = ZkCredential>(credential: T): T {
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
