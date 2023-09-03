export type ZkcId = {
  t: number,
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

export interface ZkCredProofed extends ZkCredential {
  proof: ZkcProof[];
}
