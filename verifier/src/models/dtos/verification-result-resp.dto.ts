import { Static, Type } from "@sinclair/typebox";
import { ProvingResultDto } from "./proving-result.dto.js";
import { ZcredExceptionDto } from "./zcred-exception.dto.js";

export const VerificationResultRespDto = Type.Object({
  /** Webhook URL to send "sendBody" to the 3rd applicaiton */
  webhookURL: Type.Optional(Type.String()),
  /** Redirect user after send webhook */
  redirectURL: Type.String(),
  /** Webhook body object */
  sendBody: Type.Object({
    status: Type.Enum({ exception: "exception", success: "success" }),
    sessionId: Type.String(),
    jalId: Type.String(),
    jalURL: Type.String(),
    result: Type.Union([ProvingResultDto, ZcredExceptionDto]),
    verificationResultId: Type.String(),
    verificationResultURL: Type.String()
  }, { additionalProperties: true }),
  jws: Type.String()
}, { additionalProperties: true });

export type VerificationResultRespDto = Static<typeof VerificationResultRespDto>

export type VerificationResultRespDtoNoJWS = Omit<VerificationResultRespDto, "jws">