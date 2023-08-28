export type ZkCredential = {
  isr: {
    id: { t: number, k: string }
  }
  sch: number;
  isd: number;
  exd: number; // 0 if expiration date is undefined
  sbj: {
    id: { t: number, k: string }
  } & Record<string, any>
}

export type ZkcProof = {
  key: string;
  type: string;
  target: string;
  transformSchema: string;
  sign: string;
}

export interface ZkCredProofed extends ZkCredential {
  proof: ZkcProof[]
}
