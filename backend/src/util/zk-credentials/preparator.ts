import { Field, Poseidon, PublicKey } from "snarkyjs";
import { type GraphLink, type GraphNode, Preparator } from "@sybil-center/zkc-preparator";

const numTypes = [
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
  "uint"
];

const extendNodes: GraphNode[] = [
  {
    name: "mina:field",
    isType: (value: any) => value instanceof Field
  },
  {
    name: "mina:fields",
    spread: true,
    isType: (value: any) => {
      return Array.isArray(value) && value.filter((i) => !(i instanceof Field)).length === 0;
    }
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
  {
    name: "mina:publickey-fields",
    inputType: "mina:publickey",
    outputType: "mina:fields",
    transform: (pk: PublicKey) => pk.toFields()
  },
  {
    name: "mina:hash-poseidon",
    inputType: "mina:field",
    outputType: "mina:field",
    transform: (value: Field) => Poseidon.hash([value])
  },
  ...numsToField(),
  ...numsModMinaOrder(),
];

const preparator = new Preparator();
preparator.extendGraph(extendNodes, extendLinks);

export { preparator }
