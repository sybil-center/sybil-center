import { TransformationGraph } from "./graph.js";
import sortKeys from "sort-keys";
import { Proved, TransCredSchema, ZkCred } from "../type/index.js";

export class Preparator {

  private readonly graph = new TransformationGraph();
  extendGraph = this.graph.extend.bind(this.graph);

  prepare<
    TOut extends any[] = any [],
    TCred extends (ZkCred | Proved<ZkCred>) = (ZkCred | Proved<ZkCred>),
    TSchema extends TransCredSchema = TransCredSchema
  >(credential: TCred, schema: TSchema): TOut {
    const sortedCred = sort(credential);
    const sortedSchema = sort<TransCredSchema>(schema);
    const pathValueList = toPathValueList(sortedCred);
    return pathValueList.reduce((result, { value, path }) => {
      const links = getByPath(sortedSchema, path) as string[];
      const transformed = this.graph.transform(value, links);
      const lastNode = this.graph.toLastNode(links);
      if (lastNode?.spread) transformed.forEach((it: any) => result.push(it));
      else result.push(transformed);
      return result;
    }, ([] as any[]) as TOut);
  }

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

function sort<T extends (ZkCred | TransCredSchema) = ZkCred>(credential: T): T {
  const target: Record<string, any> = {};
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
  return target as T;
}
