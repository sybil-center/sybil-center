import { TransformationGraph } from "./graph.js";
import sortKeys from "sort-keys";
import { AttributeSchema, Proof, SignSchema, ZkcID, ZkCred } from "../types/index.js";

type ZkcAttributes = ZkCred["attributes"];
type ZkcSignAttributes = ZkCred["proofs"][number]["signature"];

export type Selector = {
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
  sort = sortAttributes;

  prepareAttributes<
    TOut extends any[] = any[],
    TCred extends ZkCred = ZkCred
  >(cred: TCred, selector?: Selector): TOut {
    const _selector: Selector = selector ? selector : { proof: { index: 0 }, schema: "default" };
    const { attributeSchema } = this.selectProof(cred, _selector);
    return this._prepareAttributes<TOut>({
      attributes: cred.attributes,
      attributesSchema: attributeSchema
    });
  }

  private _prepareAttributes<
    TOut extends any[] = any[],
    TAtr extends ZkCred["attributes"] = ZkCred["attributes"]
  >(args: {
    attributes: TAtr;
    attributesSchema: AttributeSchema;
  }): TOut {
    const targetAttr: ZkcAttributes = {
      ...args.attributes
    };
    const sortedAttr = sortAttributes(targetAttr);
    const sortedSchema = sortAttributes(args.attributesSchema);
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

  prepareSign<
    TOut extends any[] = any[],
    TCred extends ZkCred = ZkCred
  >(cred: TCred, selector?: Selector): TOut {
    const _selector: Selector = selector ? selector : { proof: { index: 0 }, schema: "default" };
    const { proof: { signature }, signSchema } = this.selectProof(cred, _selector);
    return this._prepareSign<TOut>({
      signSchema: signSchema,
      signAttributes: signature
    });
  }

  private _prepareSign<
    TOut extends any[] = any[],
    TSign extends ZkcSignAttributes = ZkcSignAttributes
  >(
    args: {
      signAttributes: TSign,
      signSchema: SignSchema
    }
  ): TOut {
    const sortedSignature = sortSignature(args.signAttributes);
    const sortedSchema = sortSignature(args.signSchema);
    const pathValueList = toPathValueList(sortedSignature);
    return pathValueList.reduce((result, { value, path }) => {
      const links = getByPath(sortedSchema, path) as string[];
      const transformed = this.graph.transform(value, links);
      const lastNode = this.graph.toLastNode(links);
      if (lastNode?.spread) transformed.forEach((it: any) => result.push(it));
      else result.push(transformed);
      return result;
    }, ([] as any[]) as TOut);
  }

  selectProof(
    cred: ZkCred,
    selector?: Selector
  ): {
    proof: Proof;
    attributeSchema: AttributeSchema;
    signSchema: SignSchema
  } {
    const _selector = selector ? selector : { proof: { index: 0 }, schema: "default" };
    const {
      proof: {
        index,
        id,
        issuer,
        type
      },
      schema: schemaName
    } = _selector;
    let proof: Proof | undefined = undefined;
    if (index === 0 || index) {
      proof = cred.proofs[index];
    } else if (id) {
      proof = cred.proofs.find((it) => it.id === id);
    } else if (issuer && type) {
      proof = cred.proofs.find((it) =>
        it.signature.isr.id.t === issuer.id.t &&
        it.signature.isr.id.k === issuer.id.k &&
        it.type === type
      );
    } else if (issuer) proof = cred.proofs.find((it) =>
      it.signature.isr.id.t === issuer.id.t &&
      it.signature.isr.id.k === issuer.id.k
    );
    else if (type) proof = cred.proofs.find((it) => it.type === type);
    if (!proof) {
      throw new Error(`Can not find proof by selector = ${JSON.stringify(selector)}`);
    }
    const _schemaName = schemaName ? schemaName : "default";
    const attributeSchema = proof.attributeSchemas[_schemaName];
    if (!attributeSchema) {
      throw new Error(`Can not find transformation schema by selector = ${JSON.stringify(selector)}`);
    }
    const signSchema = proof.signatureSchemas[_schemaName]
      ? proof.signatureSchemas[_schemaName]
      : proof.signatureSchemas["default"];
    if (!signSchema) {
      throw new Error(`Can not find sign schema by selector = ${JSON.stringify(selector)}`);
    }
    return { proof, attributeSchema: attributeSchema, signSchema: signSchema };
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


function sortAttributes<
  T extends (ZkcAttributes | AttributeSchema) = ZkcAttributes
>(credential: T): T {
  const target: Record<string, any> = {};
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

function sortSignature<
  T extends (ZkcSignAttributes | SignSchema) = ZkcSignAttributes
>(attributes: T): T {
  const target: Record<string, any> = {};
  target["sign"] = attributes.sign;
  target["isr"] = {
    id: {
      t: attributes.isr.id.t,
      k: attributes.isr.id.k
    }
  };
  return target as T;
}
