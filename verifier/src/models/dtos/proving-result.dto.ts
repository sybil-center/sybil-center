import { type Static, Type } from "@sinclair/typebox";
import { Value } from '@sinclair/typebox/value'

export const ProvingResultDto = Type.Object({
  signature: Type.String(),
  message: Type.String(),
  proof: Type.String(),
  publicInput: Type.Object({
    credential: Type.Object({
      attributes: Type.Object({
        subject: Type.Object({
          id: Type.Object({
            type: Type.String(),
            key: Type.String()
          })
        })
      })
    })
  }, { additionalProperties: true }),
  publicOutput: Type.Optional(Type.Object(
    {}, { additionalProperties: true }
  )),
  verificationKey: Type.Optional(Type.String()),
  provingKey: Type.Optional(Type.String())
});

export type ProvingResultDto = Static<typeof ProvingResultDto>;

export function isProvingResultDto(o: unknown): o is ProvingResultDto {
  return Value.Check(ProvingResultDto, o)
}