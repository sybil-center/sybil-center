import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ZcredIdDto } from "./zcred-id.dto.js";

export const ProvingResultDto = Type.Object({
  signature: Type.String({ description: "Signature from agreement message" }),
  message: Type.String({ description: "Agreement message" }),
  proof: Type.String({ description: "Zero-knowledge proof" }),
  publicInput: Type.Object({
    credential: Type.Object({
      attributes: Type.Object({
        subject: Type.Object({
          id: { ...ZcredIdDto, description: "ZCIP-2 user identifier" }
        })
      })
    })
  }, { additionalProperties: true }),
  publicOutput: Type.Optional(Type.Object(
    {}, { additionalProperties: true }
  )),
  verificationKey: Type.Optional(Type.String({ description: "Verification key for ZKP verification" })),
  provingKey: Type.Optional(Type.String())
});

export type ProvingResultDto = Static<typeof ProvingResultDto>;

export function isProvingResultDto(o: unknown): o is ProvingResultDto {
  return Value.Check(ProvingResultDto, o);
}