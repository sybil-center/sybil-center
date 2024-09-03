import { type Static, Type } from "@sinclair/typebox";

export type InitClientSessionDto = Static<typeof InitClientSessionDto>;

export const InitClientSessionDto = Type.Intersect([
  Type.Object({
    subject: Type.Object({
      id: Type.Object({
        type: Type.String(),
        key: Type.String()
      })
    }),
    webhookURL: Type.Optional(Type.String({ format: "uri" })),
    redirectURL: Type.String({ format: "uri" }),
    issuer: Type.Object({
      type: Type.String(),
      uri: Type.String(),
      accessToken: Type.Optional(Type.String())
    }),
    credentialHolderURL: Type.String({ format: "uri" })
  })
], {
  $id: "InitClientSessionDto",
  description: "Client session DTO before start verification process"
});