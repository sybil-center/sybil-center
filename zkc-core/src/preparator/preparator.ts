import { TransformationGraph } from "./graph.js";
import sortKeys from "sort-keys";
import { Proof, TransSchema, ZkcID, ZkCred } from "../types/index.js";

type ZkcAttributes = ZkCred["attributes"] & {
  sign: string;
  isr: {
    id: ZkcID;
  }
}

type Selector = {
  proof: {
    id?: string;
    type?: string;
    issuer?: { id: ZkcID };
    index?: number;
  },
  schema?: string;
}

export class Preparator {

  private readonly graph = new TransformationGraph();

  extendGraph = this.graph.extend.bind(this.graph);
  transform = this.graph.transform.bind(this.graph);
  sort = sort;

  prepare<
    TOut extends any[] = any[],
    TAtr extends ZkCred["attributes"] = ZkCred["attributes"]
  >(args: {
    attributes: TAtr;
    signature: string;
    issuer: { id: ZkcID };
    transSchema: TransSchema;
  }): TOut {
    const targetAttr: ZkcAttributes = {
      sign: args.signature,
      isr: args.issuer,
      ...args.attributes
    };
    const sortedAttr = sort(targetAttr);
    const sortedSchema = sort(args.transSchema);
    const pathValueList = toPathValueList(sortedAttr);
    return pathValueList.reduce((result, { value, path }) => {
      const links = getByPath(sortedSchema, path) as string[];
      const transformed = this.graph.transform(value, links);
      const lastNode = this.graph.toLastNode(links);
      if (lastNode?.spread) transformed.forEach((it: any) => result.push(it));
      else result.push(transformed);
      return result;
    }, ([] as any[]) as TOut);
  }

  prepareCred<
    TOut extends any[] = any[],
    TCred extends ZkCred = ZkCred
  >(cred: TCred, selector?: Selector): TOut {
    const _selector: Selector = selector ? selector : { proof: { index: 0 }, schema: "default" };
    const { proof, schema } = selectProof(cred, _selector);
    return this.prepare<TOut>({
      ...proof,
      attributes: cred.attributes,
      transSchema: schema
    });
  }
}

function selectProof(
  cred: ZkCred,
  selector: Selector
): { proof: Proof, schema: TransSchema } {
  const {
    proof: {
      index,
      id,
      issuer,
      type
    },
    schema: schemaName
  } = selector;
  let proof: Proof | undefined = undefined;
  if (index === 0 || index) {
    proof = cred.proofs[index];
  } else if (id) {
    proof = cred.proofs.find((it) => it.id === id);
  } else if (issuer && type) {
    proof = cred.proofs.find((it) =>
      it.issuer.id.t === issuer.id.t &&
      it.issuer.id.k === issuer.id.k &&
      it.type === type
    );
  } else if (issuer) proof = cred.proofs.find((it) =>
    it.issuer.id.t === issuer.id.t &&
    it.issuer.id.k === issuer.id.k
  );
  else if (type) proof = cred.proofs.find((it) => it.type === type);
  if (!proof) {
    throw new Error(`Can not find proof by selector = ${JSON.stringify(selector)}`);
  }
  const _schemaName = schemaName ? schemaName : "default";
  const schema = proof.schemas[_schemaName];
  if (!schema) {
    throw new Error(`Can not find transformation schema by selector = ${JSON.stringify(selector)}`);
  }
  return { proof, schema };
}


type PathValue = {
  path: string[];
  value: any;
}

export function toPathValueList(obj: Record<string, any>): PathValue[] {
  return Object.keys(obj).reduce((vector, key) => {
    vector.concat(getPathValues(obj, key, vector));
    return vector;
  }, [] as PathValue[]);
}

function getPathValues(
  obj: any,
  key: string,
  vector: PathValue[],
  path?: string[]
): PathValue[] {
  let target = obj[key]!;
  path = !path ? [key] : path;
  if (Array.isArray(target)) target = arrToObj(target as []);
  if (typeof target === "object" && target !== null) {
    Object.keys(target).forEach((localKey) => {
      getPathValues(target, localKey, vector, path!.concat(localKey));
    });
  }
  if (isPrimitive(target)) {
    vector.push({ value: target, path: path });
  }
  return vector;
}

function arrToObj(list: []): Record<string, any> {
  return list.reduce((prev, value, index) => {
    prev[index] = value;
    return prev;
  }, {} as Record<string, any>);
}

function isPrimitive(value: any): boolean {
  return ["string", "number", "bigint", "boolean"].includes(typeof value);
}

function getByPath(obj: any, path: string[]): any {
  let current = obj;
  path.forEach((key) => {
    current = current[key];
  });
  return current;
}


function sort<
  T extends (ZkcAttributes | TransSchema) = ZkcAttributes
>(credential: T): T {
  const target: Record<string, any> = {};
  target["sign"] = credential.sign;
  target["isr"] = {
    id: {
      t: credential.isr.id.t,
      k: credential.isr.id.k
    }
  };

  target["sch"] = credential.sch;
  target["isd"] = credential.isd;
  target["exd"] = credential.exd;

  const sbjProps = Object.keys(credential.sbj)
    .filter((key) => key !== "id")
    .reduce((sbjProps, prop) => {
      //@ts-ignore
      sbjProps[prop] = credential.sbj[prop];
      return sbjProps;
    }, {} as Record<string, any>);

  target["sbj"] = {
    id: {
      t: credential.sbj.id.t,
      k: credential.sbj.id.k
    },
    ...sortKeys(sbjProps, { deep: true })
  };

  const otherAttributes = Object.keys(credential)
    .filter((key) => !(["isr", "sch", "isd", "exd", "sbj"].includes(key)))
    .reduce((result, attribute) => {
      // @ts-ignore
      result[attribute] = credential[attribute];
      return result;
    }, {} as Record<string, any>);

  return {
    ...target,
    ...sortKeys(otherAttributes, { deep: true })
  } as T;
}
