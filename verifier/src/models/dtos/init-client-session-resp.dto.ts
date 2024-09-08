import { Static, Type } from "@sinclair/typebox";

export const InitClientSessionRespDto = Type.Object({
  verifyURL: Type.String({format: "uri"})
})

export type InitClientSessionRespDto = Static<typeof InitClientSessionRespDto>