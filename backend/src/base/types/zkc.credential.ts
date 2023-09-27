export const ZKC_ID_TYPES = [0] as const
export type ZkcIdType = typeof ZKC_ID_TYPES[number]

export type ZkcId = {
  t: ZkcIdType,
  k: string
}


export type ZkCredential = {
  isr: {
    id: ZkcId;
  }
  sch: number;
  isd: number;
  exd: number; // 0 if expiration date is undefined
  sbj: {
    id: ZkcId;
  } & Record<string, any>
}

type TransCredSchema = {
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
  } & Record<string, any>;
};

export type ZkcProof = {
  key: string;
  type: string;
  target: string;
  transformSchema: TransCredSchema;
  sign: string;
}

export interface ZkCredProved extends ZkCredential {
  proof: ZkcProof[];
}

/* Schemas */

export const ZKC_SCHEMA_NAMES = ["GitHubAccount", "Passport"] as const;
export type ZkcSchemaNames = typeof ZKC_SCHEMA_NAMES[number];

export const ZKC_SCHEMA_NUMS = [0, 1] as const;
export type ZkcSchemaNums = typeof ZKC_SCHEMA_NUMS[number];

