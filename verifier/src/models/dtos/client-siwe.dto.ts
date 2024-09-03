import { Static, Type } from "@sinclair/typebox";

export const ClientSiweDto = Type.Object({
  siwe: Type.Object({
    message: Type.String(),
    signature: Type.String()
  })
});

export type ClientSiweDto = Static<typeof ClientSiweDto>