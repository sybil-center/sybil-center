export const ZKC_ID_TYPES = [0, 1] as const;
export type ZkcIdType = typeof ZKC_ID_TYPES[number]

export const ZKC_ID_TYPE_ALIASES = ["mina", 0, "eth", 1] as const;
export type ZkcIdTypeAlias = typeof ZKC_ID_TYPE_ALIASES[number]

export type ZkcId = {
  t: ZkcIdType,
  k: string
}

export type ZkCred<
  TSbj = Record<string, any | undefined>
> = {
  isr: {
    id: ZkcId;
  }
  sch: number;
  isd: number;
  exd: number; // 0 if expiration date is undefined
  sbj: {
    id: ZkcId;
  } & TSbj
}

export type Proved<
  TCred extends ZkCred
> = TCred & { proof: ZkcProof[] }

export type TransCredSchema = {
  isr: {
    id: {
      t: string[];
      k: string[];
    };
  };
  sch: string[];
  isd: string[];
  exd: string[];
  sbj: {
    id: {
      t: string[];
      k: string[];
    };
  } & Record<string, any | undefined>;
};

export type ZkcProof = {
  id?: string;
  key: string;
  type: string;
  transformSchema: TransCredSchema;
  sign: string;
}

/* Schemas */

export const ZKC_SCHEMA_NAMES = ["GitHubAccount", "Passport"] as const;
export type ZkcSchemaNames = typeof ZKC_SCHEMA_NAMES[number];

export const ZKC_SCHEMA_NUMS = [0, 1] as const;
export type ZkcSchemaNums = typeof ZKC_SCHEMA_NUMS[number];

