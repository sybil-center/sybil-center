import { type Static, Type } from "@sinclair/typebox";

export const ZcredIdDto = Type.Object({
  type: Type.String({
    description: "ZCIP-2 identifier type. E.g. 'ethereum:address'"
  }),
  key: Type.String({
    description: "ZCIP-2 identifier key (public key or address)"
  })
});

export type ZcredIdDto = Static<typeof ZcredIdDto>;