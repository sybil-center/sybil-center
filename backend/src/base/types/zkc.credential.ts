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

export type ZkcProof = {
  key: string;
  type: string;
  target: string;
  transformSchema: Record<string, any>;
  sign: string;
}

export interface ZkCredProofed extends ZkCredential {
  proof: ZkcProof[];
}
