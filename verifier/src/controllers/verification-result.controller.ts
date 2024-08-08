import { Injector } from "typed-inject";
import { DI } from "../app.js";
import { stringifyZCredtId } from "../util/index.js";
import { SIWE_STATEMENT } from "../consts/index.js";

export function VerificationResultController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const verificationService = injector.resolve("verificationService");
  const siweService = injector.resolve("siweService");

  fastify.post<{
    Body: {
      siwe: {
        message: string;
        signature: string;
      }
    },
    Params: { id: string }
  }
  >(`/api/v2/verification-result/:id`, {
    schema: {
      body: {
        type: "object",
        required: ["siwe"],
        properties: {
          siwe: {
            type: "object",
            required: ["message", "signature"],
            properties: {
              message: { type: "string" },
              signature: { type: "string" }
            }
          }
        }
      }
    }
  }, async (req, resp) => {
    const verificationResultId = req.params.id;
    const { message, signature } = req.body.siwe;
    const { id: clientId } = await siweService.verify(
      { message, signature },
      { statement: SIWE_STATEMENT.GET_VERIFICATION_RESULT }
    );
    const strClientId = stringifyZCredtId(clientId);
    const verificationResult = await verificationService.getVerificationResultById(verificationResultId);
    if (!verificationResult) {
      resp.statusCode = 400;
      return { message: `Verification result by id: ${verificationResultId}` };
    }
    const expStrClientId = stringifyZCredtId(verificationResult.data.session.client.siwe.id);
    if (strClientId !== expStrClientId) {
      resp.statusCode = 403;
      return { message: "Invalid SIWE message and signature" };
    }
    return verificationResult;
  });

}