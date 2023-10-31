export type ZkcID = {
  t: number;
  k: string;
}

export type ZkCred<
  TSbj = Record<string, unknown>,
> = {
  proofs: Proof[]
  attributes: {
    sch: number;
    isd: number;
    exd: number;
    sbj: {
      id: ZkcID;
    } & TSbj
  }
}

export type TransSchema = {
  sign: string[];
  isr: {
    id: {
      t: string[];
      k: string[];
    }
  };
  sch: string[];
  isd: string[];
  exd: string[];
  sbj: {
    id: {
      t: string[];
      k: string[];
    }
  } & Record<string, unknown>;
} & Record<string, unknown>

export type Proof = {
  id?: string;
  issuer: {
    id: ZkcID;
  }
  signature: string;
  type: string;
  schemas: {
    default: TransSchema;
  } & Record<string, TransSchema | undefined>
}