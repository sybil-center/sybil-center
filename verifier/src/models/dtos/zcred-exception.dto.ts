import { Static, Type } from "@sinclair/typebox";

export const ZcredExceptionDto = Type.Object({
  code: Type.Number(),
  message: Type.Optional(Type.String())
});

export type ZcredExceptionDto = Static<typeof ZcredExceptionDto>;