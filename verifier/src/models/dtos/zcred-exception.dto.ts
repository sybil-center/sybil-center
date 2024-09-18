import { Static, Type } from "@sinclair/typebox";

export const ZcredExceptionDto = Type.Object({
  code: Type.Number({ description: "Exception code" }),
  message: Type.Optional(Type.String({ description: "Exception message" }))
});

export type ZcredExceptionDto = Static<typeof ZcredExceptionDto>;