import { Static, Type } from "@sinclair/typebox";

export const InitClientSessionRespDto = Type.Object({
  verifyURL: Type.String({
    format: "uri",
    description: "URL where the user needs to be redirected to complete the verification"
  }),
  sessionId: Type.String({
    description: "Verifier sessin identifier"
  })
});

export type InitClientSessionRespDto = Static<typeof InitClientSessionRespDto>