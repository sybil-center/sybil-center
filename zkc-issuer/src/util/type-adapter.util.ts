import {
  ZKC_ID_TYPE_ALIASES,
  ZKC_SCHEMA_NAMES,
  ZKC_SCHEMA_NUMS,
  ZkcId,
  ZkcIdType, ZkcIdTypeAlias,
  ZkcSchemaNames,
  ZkcSchemaNums
} from "../type/index.js";


const SCHEMA_STR_TO_NUM: Record<ZkcSchemaNames, ZkcSchemaNums> = {
  GitHubAccount: 1,
  Passport: 0
};

const SCHEMA_NUM_TO_STR: Record<ZkcSchemaNums, ZkcSchemaNames> = {
  0: "Passport",
  1: "GitHubAccount"
};

const Schema = {
  toNum: (schemaName: string): ZkcSchemaNums => {
    function isSchemaName(name: string): name is ZkcSchemaNames {
      return ZKC_SCHEMA_NAMES
        // @ts-ignore
        .includes(name);
    }
    const isName = isSchemaName(schemaName);
    if (isName) {
      return SCHEMA_STR_TO_NUM[schemaName];
    }
    throw new Error(`Schema name ${schemaName} is not supported`);
  },

  toName: (schemaNum: number): ZkcSchemaNames => {
    function isSchemaNum(num: number): num is ZkcSchemaNums {
      return ZKC_SCHEMA_NUMS
        // @ts-ignore
        .includes(num);
    }
    const isNum = isSchemaNum(schemaNum);
    if (isNum) {
      return SCHEMA_NUM_TO_STR[schemaNum];
    }
    throw new Error(`Schema number ${schemaNum} is not supported`);
  }
};


const IDALIAS_TO_IDTYPE: Record<ZkcIdTypeAlias, ZkcId["t"]> = {
  0: 0,
  "mina": 0,
};

const IdType = {
  isAlias: (aliasType: number | string): aliasType is ZkcIdTypeAlias => {
    return ZKC_ID_TYPE_ALIASES
      // @ts-ignore
      .includes(aliasType)
  },
  fromAlias: (aliasType: number | string): ZkcIdType => {
    const isAliasType = IdType.isAlias(aliasType);
    if (isAliasType) return IDALIAS_TO_IDTYPE[aliasType];
    throw new Error(`Id type alias ${aliasType} is not supported`);
  }
};

export { Schema, IdType };
