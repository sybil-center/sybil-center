import { type Static, Type } from "@sinclair/typebox";
import { ProvingResultDto } from "./proving-result.dto.js";
import { ZcredExceptionDto } from "./zcred-exception.dto.js";

export const VerificationResultDto = Type.Union([ProvingResultDto, ZcredExceptionDto]);

export type VerificationResultDto = Static<typeof VerificationResultDto>