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

export type SignSchema = {
  sign: string[];
  isr: {
    id: {
      t: string[];
      k: string[];
    }
  };
}

export type AttributeSchema = {
  sch: string[];
  isd: string[];
  exd: string[];
  sbj: {
    id: {
      t: string[];
      k: string[];
    }
  } & Record<string, unknown>;
};

export type Proof = {
  id?: string;
  type: string;
  signature: {
    isr: { id: ZkcID; };
    sign: string;
  }
  signatureSchemas: {
    default: SignSchema;
  } & Record<string, SignSchema | undefined>;
  attributeSchemas: {
    default: AttributeSchema;
  } & Record<string, AttributeSchema | undefined>;
}