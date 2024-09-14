import { Static, Type } from "@sinclair/typebox";

export const InitClientSessionRespDto = Type.Object({
  verifyURL: Type.String(),
  sessionId: Type.String()
})

export type InitClientSessionRespDto = Static<typeof InitClientSessionRespDto>