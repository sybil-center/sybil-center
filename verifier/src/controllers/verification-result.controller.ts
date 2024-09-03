import { Injector } from "typed-inject";
import { DI } from "../app.js";
import { extractBearerToken, jwkToZcredId, stringifyZCredtId } from "../util/index.js";
import { VERIFIER_STATEMENT } from "../consts/index.js";
import { type Static, Type } from "@sinclair/typebox";

export const GetVerificationResultDto = Type.Object({
  subject: Type.Object({
    id: Type.Object({
      type: Type.String(),
      key: Type.String()
    })
  }),
  jalId: Type.String()
});

export type GetVerificationResultDto = Static<typeof GetVerificationResultDto>

export function VerificationResultController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const verificationResultService = injector.resolve("verificationResultService");
  const jwsVerifierService = injector.resolve("jwsVerifierService");

  fastify.get<{
    Params: { id: string }
  }
  >(`/api/v2/verification-result/:id`, async (req, resp) => {
    if (!req.headers.authorization) {
      resp.statusCode = 401;
      return { message: "Bearer token is not specified in Authorization header" };
    }
    const jws = extractBearerToken(req.headers.authorization);
    const verificationResultId = req.params.id;
    const { jwk } = await jwsVerifierService.verifyJWS(jws, {
      statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT
    });
    const clientId = jwkToZcredId(jwk);
    const strClientId = stringifyZCredtId(clientId);
    const verificationResult = await verificationResultService.getVerificationResultById(verificationResultId);
    if (!verificationResult) {
      resp.statusCode = 400;
      return { message: `Verification result by id: ${verificationResultId}` };
    }
    const expStrClientId = stringifyZCredtId(verificationResult.data.session.client.id);
    if (strClientId !== expStrClientId) {
      resp.statusCode = 403;
      return { message: "Invalid JWK from JWS" };
    }
    return verificationResult;
  });

}