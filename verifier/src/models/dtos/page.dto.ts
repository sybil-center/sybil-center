import { Static, Type } from "@sinclair/typebox";

export const PageDto = Type.Object({
  size: Type.Number(),
  index: Type.Number(),
});

export type PageDto = Static<typeof PageDto>