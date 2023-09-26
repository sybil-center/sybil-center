import { GraphLink, GraphNode, Preparator, TransCredSchema, TransformationGraph } from "@sybil-center/zkc-preparator";
import { Field, Poseidon, PublicKey } from "snarkyjs";
import { schemaNames, schemaNums, ZkCredential, ZkcSchemaNames, ZkcSchemaNums } from "../base/types/zkc.credential.js";
import sortKeys from "sort-keys";
import { ZkcIdAlias, zkcIdAliases } from "../base/types/zkc.issuer.js";

/* Extending Transformation Graph */

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

if (!("graph" in preparator)) {
  throw new Error(`Transformation graph reference as "graph" is not in ZKC Preparator`);
}


/* Supported Transformations Schemas */

type ZkcTypeValue = Record<string, TransCredSchema>;

const minaGitAccountTransSchema: TransCredSchema = {
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

const minaPassportTransSchema: TransCredSchema = {
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

const githubAccountTransSchema: Record<ZkcIdAlias, TransCredSchema> = {
  mina: minaGitAccountTransSchema,
  0: minaGitAccountTransSchema,
};

const passportTransSchema: Record<ZkcIdAlias, TransCredSchema> = {
  mina: minaPassportTransSchema,
  0: minaPassportTransSchema
};


const TRANS_SCHEMAS: Record<string, ZkcTypeValue> = {
  "Passport": passportTransSchema,
  0: passportTransSchema,
  "GitHubAccount": githubAccountTransSchema,
  1: githubAccountTransSchema,
};

/* Supported ZKC Identifiers Aliases */

const ZKC_IDS: Record<ZkcIdAlias, number> = {
  mina: 0,
  0: 0,
};

/* Supported ZKC Schemas */

const SCHEMA_NAME_TO_NUM: Record<ZkcSchemaNames, ZkcSchemaNums> = {
  "GitHubAccount": 1,
  "Passport": 0,
};

const SCHEMA_NUM_TO_NAME: Record<ZkcSchemaNums, ZkcSchemaNames> = {
  1: "GitHubAccount",
  0: "Passport"
};

/* ZKC schema name to URL name */

function schemaToURL(name: ZkcSchemaNames) {
  return name
    .toString()
    .replace(/([a-z0–9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/* Entry Point Object */

export const zkc = {
  prepare: preparator.prepare,
  preparator: preparator,
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
  },
  // @ts-ignore
  transGraph: preparator.graph as TransformationGraph,


  transSchemas: (type: string | number): ZkcTypeValue => {
    const transSchemas = TRANS_SCHEMAS[type];
    if (transSchemas) return transSchemas;
    throw new Error(`Schema type ${type} is not supported`);
  },

  toId(aliasId: ZkcIdAlias): number {
    const zkcid = ZKC_IDS[aliasId];
    if (zkcid !== undefined) return zkcid;
    throw new Error(`ZKC identifier with alias name ${aliasId} not found`);
  },

  isIdAlias(alias: string | number): alias is ZkcIdAlias {
    // @ts-ignore
    return zkcIdAliases.includes(typeof alias === "number" ? alias.toString() : alias);
  },

  isSchemaName(alias: string): alias is ZkcSchemaNames {
    // @ts-ignore
    return schemaNames.includes(alias);
  },

  toSchemaNum<T = ZkcSchemaNums>(alias: string): T {
    const isName = zkc.isSchemaName(alias);
    if (isName) return SCHEMA_NAME_TO_NUM[alias] as T;
    throw new Error(`ZKC schema name ${alias} is not supported`);
  },

  isSchemaNum(alias: number): alias is ZkcSchemaNums {
    // @ts-ignore
    return schemaNums.includes(alias);
  },

  toSchemaName<T = ZkcSchemaNames>(alias: number): T {
    const isNum = zkc.isSchemaNum(alias);
    if (isNum) return SCHEMA_NUM_TO_NAME[alias] as T;
    throw new Error(`ZKC schema num ${alias} is not supported`);
  },

  EPs: {
    v1: (schemaName: ZkcSchemaNames) => {
      const baseURL = `/api/v1/zkc/${schemaToURL(schemaName)}`;
      return {
        challenge: `${baseURL}/challenge`,
        canIssue: `${baseURL}/can-issue`,
        issue: `${baseURL}/issue`
      };
    }
  }

};
