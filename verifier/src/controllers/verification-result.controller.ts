import { Injector } from "typed-inject";
import { DI } from "../app.js";
import { extractBearerToken, fromStringZcredId, jwkToZcredId, stringifyZCredtId } from "../util/index.js";
import { VERIFIER_STATEMENT } from "../consts/index.js";
import { type Static, Type } from "@sinclair/typebox";
import { PageDto } from "../models/dtos/page.dto.js";
import { ZcredExceptionDto } from "../models/dtos/zcred-exception.dto.js";
import { ProvingResultDto } from "../models/dtos/proving-result.dto.js";
import { AuthorizationJwsHeader } from "../models/dtos/authorization-jws-header.dto.js";
import { ZcredIdDto } from "../models/dtos/zcred-id.dto.js";

export const GetVerificationResultDto = Type.Object({
  subject: Type.Object({
    id: ZcredIdDto,
  }),
  jalId: Type.String()
});

export type GetVerificationResultDto = Static<typeof GetVerificationResultDto>

export const VerificationResultFilterDto = Type.Optional(Type.Object({
  id: Type.Optional(Type.String({
    description: "Verification result identifier (verificationResultId)"
  })),
  jalId: Type.Optional(Type.String({
    description: "JAL program identifier"
  })),
  subjectId: Type.Optional({
    ...ZcredIdDto,
    description: "ZCIP-2 user identidier"
  }),
  status: Type.Optional(Type.Enum({
    success: "success", exception: "exception"
  }, { description: "Verification status" }))
}, { description: "Pagination filter" }));


export const VerificationResultPageResponseDto = Type.Object({
  result: Type.Array(Type.Object({
    id: Type.String({ description: "Verification result identifier" }),
    status: Type.Enum({
        success: "success",
        exception: "exception"
      }, {
        description: `Verification result status: "success" or "exception"`
      }
    ),
    data: Type.Object({
      exception: Type.Optional(ZcredExceptionDto),
      provingResult: Type.Optional(ProvingResultDto)
    }, { additionalProperties: true }),
    clientId: { ...ZcredIdDto, description: "ZCIP-2 client identifier" },
    subjectId: { ...ZcredIdDto, description: "ZCIP-2 subject identifier" },
    createdAt: Type.Date({ description: "Verification result creation date and time" }),
    jalId: Type.String({ description: "JAL program identifier" })
  })),
  currentIndex: Type.Number({ description: "Current page index" }),
  prevIndex: Type.Union([Type.Number(), Type.Null()], { description: "Previous page index" }),
  nextIndex: Type.Union([Type.Number(), Type.Null()], { description: "Next page index" }),
  count: Type.Number({ description: "Page count" }),
  recordsCount: Type.Number({ description: "Total records count" })

});

export type VerificationResultPageResponseDto = Static<typeof VerificationResultPageResponseDto>

export type VerificationResultFilterDto = Static<typeof VerificationResultFilterDto>;

const TAGS = ["Verification result"];

export function VerificationResultController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const verificationResultService = injector.resolve("verificationResultService");
  const jwsVerifierService = injector.resolve("jwsVerifierService");

  fastify.get<{
    Params: { id: string },
    Headers: AuthorizationJwsHeader
  }
  >(`/api/v2/verification-result/:id`, {
    schema: {
      headers: AuthorizationJwsHeader,
      tags: TAGS,
      description: "Get verification result by id"
    }
  }, async (req, resp) => {
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

  fastify.post<{
    Body: VerificationResultFilterDto,
    Querystring: PageDto,
    Headers: AuthorizationJwsHeader
  }>(`/api/v2/verification-result/page`, {
    schema: {
      tags: TAGS,
      body: VerificationResultFilterDto,
      querystring: PageDto,
      headers: AuthorizationJwsHeader,
      description: "Get verification result page"
    }
  }, async (req, resp): Promise<VerificationResultPageResponseDto | { message: string }> => {
    if (!req.headers.authorization) {
      resp.statusCode = 401;
      return { message: "Bearer token is not specified in Authorization header" };
    }
    const jws = extractBearerToken(req.headers.authorization);
    const { jwk } = await jwsVerifierService.verifyJWS(jws, {
      statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT
    });
    const clientId = jwkToZcredId(jwk);
    const page = await verificationResultService.getPage({
      filter: {
        id: { eq: req.body.id },
        jalId: { eq: req.body.jalId },
        clientId: { eq: stringifyZCredtId(clientId) },
        subjectId: { eq: req.body.subjectId ? stringifyZCredtId(req.body.subjectId) : undefined },
        status: { eq: req.body.status }
      },
      page: {
        size: req.query.size,
        index: req.query.index
      },
      order: {
        desc: ["createdAt"]
      }
    });
    const resultList: (VerificationResultPageResponseDto["result"][number])[] = [];
    for (const result of page.result) {
      resultList.push({
        id: result.id,
        status: result.status,
        jalId: result.jalId,
        data: {
          provingResult: result.data.provingResult,
          exception: result.data.exception,
        },
        clientId: fromStringZcredId(result.clientId),
        subjectId: fromStringZcredId(result.subjectId),
        createdAt: result.createdAt,
      });
    }
    return {
      currentIndex: page.currentIndex,
      nextIndex: page.nextIndex,
      prevIndex: page.prevIndex,
      count: page.count,
      recordsCount: page.recordsCount,
      result: resultList
    };
  });

}