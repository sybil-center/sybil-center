
export type DecodedJWS = {
  header: {
    alg?: string;
    kid?: string;
  },
  payload: Record<string, any>,
  signature: string;
}


