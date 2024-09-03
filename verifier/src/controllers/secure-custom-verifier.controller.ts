import { Injector } from "typed-inject";
import { DI } from "../app.js";
import { InitClientSessionDto } from "../models/dtos/init-client-session.dto.js";
import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import crypto from "node:crypto";
import { Identifier, isJsonZcredException, JsonZcredException, VEC, VECode } from "@zcredjs/core";
import { VERIFIER_STATEMENT } from "../consts/index.js";
import { ChallengeMessage } from "../services/challenge-message.js";
import sortKeys from "sort-keys";
import * as u8a from "uint8arrays";
import { Proposal, ProvingResult } from "../types/index.js";
import { VerifierException } from "../backbone/exception.js";
import { type FastifyRequest } from "fastify";
import { VerificationResultDto } from "../models/dtos/verification-result.dto.js";
import { extractBearerToken, jwkToZcredId, normalizeZcredId, stringifyZCredtId } from "../util/index.js";
import * as jose from "jose";
import {
  VerificationResultRespDto,
  VerificationResultRespDtoNoJWS,
} from "../models/dtos/verification-result-resp.dto.js";
import { isProvingResultDto, ProvingResultDto } from "../models/dtos/proving-result.dto.js";
import { InitClientSessionRespDto } from "../models/dtos/init-client-session-resp.dto.js";

const JalIdParams = Type.Object({
  jalId: Type.String()
});

type JalIdParams = Static<typeof JalIdParams>;

type ClientSession = Omit<InitClientSessionDto, "client"> & {
  /** Session identifier */
  id: string;
  /** JAL program identifier */
  jalId: string;
  client: { id: Identifier; };
}

const GetProposalQuery = Type.Object({
  sessionId: Type.String()
});

type GetProposalQuery = Static<typeof GetProposalQuery>;

const ProofOfWorkJwsPayload = Type.Object({
  challenge: Type.Object({
    messageHash: Type.String(), // hex string,
    nonce: Type.Number()
  }),
  proof: Type.String() // hex string
});

type ProofOfWorkJwsPayload = Static<typeof ProofOfWorkJwsPayload>;


export async function SecureCustomVerifierController(injector: Injector<DI>) {
  const config = injector.resolve("config");
  const fastify = injector.resolve("httpServer").fastify;
  const verificationResultService = injector.resolve("verificationResultService");
  const zcredVerifierManager = injector.resolve("zcredVerifierManager");
  const cacheClient = injector.resolve("cacheClient");
  const secretService = injector.resolve("secretService");
  const jwsVerifierService = injector.resolve("jwsVerifierService");
  const jalCommentService = injector.resolve("jalCommentService");
  const clientSessionCache = cacheClient.createTtlCache<ClientSession>({
    namespace: "client-session",
    ttl: 12 * 60 * 60 * 1000 /* 12 hours */
  });
  const challengeMessageCache = cacheClient.createTtlCache<string>({
    namespace: "challenge-message",
    ttl: 12 * 60 * 60 * 1000 /* 12 hours */
  });
  const jwkKID = new URL("/api/v2/verifier-jwk.json", config.exposeDomain).href;
  const jwsAlg = "ES256K";
  const { importedJWK, publicJWK } = await secretService.generateJWK({
    kid: jwkKID,
    alg: jwsAlg,
    secretPrefix: "zcred-verifier-secp256k1"
  });
  const sessionSecret = secretService.generateSecret({
    secretPrefix: "zcred-verifier-secret"
  });

  /**
   * Create client session and return JSON in HTTP body with
   * "verifyURL" where user will be redirected to start verification
   */
  fastify.post<{
    Body: InitClientSessionDto,
    Params: JalIdParams,
  }>("/api/v2/verifier/:jalId/session", {
    schema: {
      body: InitClientSessionDto,
      params: JalIdParams,
    }
  }, async (req, resp): Promise<InitClientSessionRespDto | { message: string }> => {
    if (!req.headers.authorization) {
      resp.statusCode = 401;
      return { message: `Authorization header is not specified as 'Bearer <jws>'` };
    }
    const jws = extractBearerToken(req.headers.authorization);
    const {
      body: clientSessionDto,
      params: { jalId }
    } = req;
    clientSessionDto.subject.id = normalizeZcredId(clientSessionDto.subject.id);
    const { jwk } = await jwsVerifierService.verifyJWS(jws, {
      statement: VERIFIER_STATEMENT.CREATE_SESSION
    });
    const clientId = jwkToZcredId(jwk);
    const sessionId = generateClientSessionId(clientSessionDto);
    await cacheClientSession({
      clientSessionDto: clientSessionDto,
      sessionId: sessionId,
      jalId: jalId,
      clientId: clientId
    });
    const verifyURL = createUserRedirectURL({
      jalId: jalId,
      sessionId: sessionId,
      credHolderURL: clientSessionDto.credentialHolderURL
    });
    resp.statusCode = 201;
    return { verifyURL: verifyURL.href };
  });

  function generateClientSessionId(clientSession: InitClientSessionDto): string {
    const bytes = u8a.fromString(
      JSON.stringify(sortKeys(clientSession, { deep: true })),
    );
    return crypto.createHmac("sha256", sessionSecret)
      .update(bytes)
      .digest("base64url");
  }

  async function cacheClientSession(input: {
    clientSessionDto: InitClientSessionDto;
    sessionId: string;
    jalId: string;
    clientId: Identifier;
  }) {
    const { clientSessionDto, sessionId, jalId, clientId } = input;
    const foundSession = await clientSessionCache.get(sessionId);
    if (!foundSession) {
      await clientSessionCache.set(sessionId, {
        id: sessionId,
        ...clientSessionDto,
        client: {
          id: clientId,
        },
        jalId: jalId,
      });
    }
  }

  function createUserRedirectURL(input: {
    jalId: string;
    sessionId: string;
    credHolderURL: string;
  }): URL {
    const {
      jalId,
      sessionId,
      credHolderURL
    } = input;
    const proposalURL = new URL(`./api/v2/verifier/${jalId}/proposal`, config.exposeDomain);
    proposalURL.searchParams.set("sessionId", sessionId);
    const userRedirectURL = new URL(credHolderURL);
    userRedirectURL.searchParams.set("proposalURL", proposalURL.href);
    return userRedirectURL;
  }

  /**
   * Start verification process, user get Proposal
   */
  fastify.get<{
    Params: JalIdParams,
    Querystring: GetProposalQuery
  }>(`/api/v2/verifier/:jalId/proposal`, {
    schema: {
      params: JalIdParams,
      querystring: GetProposalQuery
    }
  }, async (req, resp): Promise<Proposal | { message: string }> => {
    const {
      params: { jalId },
      query: { sessionId }
    } = req;
    const session = await clientSessionCache.get(sessionId);
    if (!session) {
      resp.statusCode = 400;
      return { message: `Client session with id: ${sessionId} not found` };
    }
    if (jalId !== session.jalId) {
      resp.statusCode = 400;
      return { message: `Invalid JAL program identifier` };
    }
    const { issuer, subject } = session;
    const verifierURL = createVerifierURL({ sessionId, jalId });
    const challengeMessage = await getChallengeMessage({
      verifierURL: verifierURL,
      sessionId: sessionId
    });
    const { program, selector } = await zcredVerifierManager.getProposal({
      subjectId: subject.id,
      metaIssuer: issuer,
      jalId: jalId
    });
    const commentEntity = await jalCommentService.getOne({
      jalId: jalId,
      clientId: stringifyZCredtId(session.client.id)
    });
    return {
      program: program,
      selector: selector,
      challenge: { message: challengeMessage },
      accessToken: issuer.accessToken,
      verifierURL: verifierURL.href,
      comment: commentEntity?.comment
    } satisfies Proposal;
  });

  async function getChallengeMessage(input: { sessionId: string, verifierURL: URL }) {
    const { sessionId, verifierURL } = input;
    const foundChallengeMessage = await challengeMessageCache.get(sessionId);
    if (foundChallengeMessage) {
      return foundChallengeMessage;
    } else {
      const challengeMessage = ChallengeMessage.toMessage({
        verifierURL: verifierURL.href,
        nonce: crypto.randomUUID()
      });
      await challengeMessageCache.set(sessionId, challengeMessage);
      return challengeMessage;
    }

  }

  function createVerifierURL(input: { sessionId: string; jalId: string }): URL {
    const { sessionId, jalId } = input;
    const verifierURL = new URL(`./api/v2/verifier/${jalId}/verify`, config.exposeDomain);
    verifierURL.searchParams.set("sessionId", sessionId);
    return verifierURL;
  }

  /**
   * Verify proving result
   */
  fastify.post<{
    Body: VerificationResultDto
    Querystring: { [key: string]: unknown }
  }>(`/api/v2/verifier/:jalId/verify`, {
    schema: { body: VerificationResultDto }
  }, async (req): Promise<VerificationResultRespDto | { code: VECode, message: string }> => {
    const body = req.body;
    const sessionId = getSessionIdFromQuery(req);
    const clientSession = await findSessionById(sessionId);
    if (isJsonZcredException(body)) {
      const challengeMessage = await challengeMessageCache.get(sessionId);
      if (!challengeMessage) {
        return {
          code: VEC.VERIFY_NO_SESSION,
          message: `Can not find session by session id: ${sessionId}`
        };
      }
      return await protectJWS(await onException({
        clientSession: clientSession,
        zcredException: body,
        headers: req.headers,
        challengeMessage: challengeMessage
      }));
    } else if (isProvingResultDto(body)) {
      return await protectJWS(await onSuccess({
        provingResult: body,
        clientSession: clientSession
      }));
    }
    throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ,
      msg: "Invalid verification request body"
    });
  });

  async function onException(input: {
    clientSession: ClientSession;
    zcredException: JsonZcredException;
    headers: FastifyRequest["headers"];
    challengeMessage: string
  }): Promise<VerificationResultRespDtoNoJWS> {
    const { clientSession, zcredException, headers, challengeMessage } = input;
    if (!headers.authorization) {
      throw new Error(`Authorization Header not found`);
    }
    const jwt = extractBearerToken(headers.authorization);
    await verifyProofOfWork({
      jwt, challengeMessage
    });
    const jalId = clientSession.jalId;
    const { id: verificationResultId } = await verificationResultService.save({
      jalId: jalId,
      clientId: stringifyZCredtId(clientSession.client.id),
      data: {
        exception: zcredException,
        session: clientSession
      }
    });
    const jalURL = getJalURL(jalId);
    const verificationResultURL = getVerificationResultURL(verificationResultId);
    const redirectURL = getRedirectURL({
      redirectURLStr: clientSession.redirectURL,
      sessionId: clientSession.id,
      verificationResultId: verificationResultId
    });
    return {
      webhookURL: clientSession.webhookURL,
      redirectURL: redirectURL.href,
      sendBody: sortKeys({
        sessionId: clientSession.id,
        status: "exception",
        jalId: jalId,
        jalURL: jalURL.href,
        verificationResultId: verificationResultId,
        verificationResultURL: verificationResultURL.href,
        result: zcredException
      }, { deep: true })
    };
  }

  async function verifyProofOfWork(input: {
    jwt: string;
    challengeMessage: string;
  }): Promise<{ ok: boolean; message: string }> {
    const { challengeMessage, jwt } = input;
    const secret = crypto.createHash("sha256")
      .update(u8a.fromString(challengeMessage))
      .digest();
    const { payload: payloadBytes } = await jose.compactVerify(jwt, secret);
    const payload = JSON.parse(u8a.toString(payloadBytes));
    if (!Value.Check(ProofOfWorkJwsPayload, payload)) {
      return { ok: false, message: `Invalid JWT payload` };
    }
    if (!payload.proof.startsWith("0".repeat(5))) {
      return { ok: false, message: `JWT payload proof of work MUST start from "00000"` };
    }
    if (payload.challenge.messageHash !== u8a.toString(secret, "hex")) {
      return { ok: false, message: `JWT payload challenge messageHash is not correct` };
    }
    const actualProof = crypto.createHash("sha256")
      .update(u8a.fromString(JSON.stringify(sortKeys(payload.challenge))))
      .digest("hex");
    if (actualProof !== payload.proof) {
      return { ok: false, message: `Invalid JWT payload proof` };
    }
    return {
      ok: true,
      message: ""
    };
  }

  async function onSuccess(input: {
    clientSession: ClientSession;
    provingResult: ProvingResultDto;
  }): Promise<VerificationResultRespDtoNoJWS> {
    const { provingResult, clientSession } = input;
    const expectedSubjectId = clientSession.subject.id;
    checkSubjectId({ provingResult, expectedSubjectId });
    checkContextTime(provingResult);
    const challengeMessage = await findChallengeMessageById(clientSession.id);
    if (challengeMessage !== provingResult.message) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: "Challenge message changed"
      });
    }
    await checkProvingResult({
      provingResult: provingResult,
      clientSession: clientSession
    });
    const { id: verificationResultId } = await verificationResultService.save({
      jalId: clientSession.jalId,
      clientId: stringifyZCredtId(clientSession.client.id),
      data: {
        provingResult: provingResult,
        session: clientSession
      }
    });
    const jalURL = getJalURL(clientSession.jalId);
    const verificationResultURL = getVerificationResultURL(verificationResultId!);
    const redirectURL = getRedirectURL({
      sessionId: clientSession.id,
      redirectURLStr: clientSession.redirectURL,
      verificationResultId: verificationResultId!,
    });
    await clientSessionCache.delete(clientSession.id);
    await challengeMessageCache.delete(clientSession.id);
    return {
      webhookURL: clientSession.webhookURL,
      redirectURL: redirectURL.href,
      sendBody: sortKeys({
        sessionId: clientSession.id,
        status: "success",
        jalId: clientSession.jalId,
        jalURL: jalURL.href,
        verificationResultId: verificationResultId!,
        verificationResultURL: verificationResultURL.href,
        result: provingResult
      }, { deep: true })
    };
  }

  async function protectJWS(
    verificationResp: VerificationResultRespDtoNoJWS
  ): Promise<VerificationResultRespDto> {
    const sendBody = verificationResp.sendBody;
    const payload = new TextEncoder().encode(JSON.stringify(sortKeys(sendBody, { deep: true })));
    const jws = await new jose.CompactSign(payload)
      .setProtectedHeader({ alg: jwsAlg, kid: jwkKID })
      .sign(importedJWK);
    const jwsSplit = jws.split(".");
    const detachedJWS = `${jwsSplit[0]}..${jwsSplit[2]}`;
    return {
      ...verificationResp,
      jws: detachedJWS
    };
  }

  async function checkProvingResult(input: {
    provingResult: ProvingResult;
    clientSession: ClientSession;
  }) {
    const { provingResult, clientSession } = input;
    const isProvingResultVerified = await verificationResultService.verifyProvingResult({
      jalId: clientSession.jalId,
      provingResult: provingResult
    });
    if (!isProvingResultVerified) {
      throw new VerifierException({
        code: VEC.VERIFY_INVALID_PROOF,
        msg: "Invalid proving result"
      });
    }
  }

  function getJalURL(jalId: string): URL {
    return new URL(`/api/v1/jal/${jalId}`, config.exposeDomain);
  }

  function getVerificationResultURL(id: string): URL {
    return new URL(`./api/v2/verification-result/${id}`, config.exposeDomain);
  }

  function getRedirectURL(input: {
    redirectURLStr: string;
    sessionId: string;
    verificationResultId: string;
    exceptionCode?: JsonZcredException["code"]
  }): URL {
    const redirectURL = new URL(input.redirectURLStr);
    redirectURL.searchParams.set("sessionId", input.sessionId);
    redirectURL.searchParams.set("verificationResultId", input.verificationResultId);
    return redirectURL;
  }

  async function findChallengeMessageById(sessionId: string): Promise<string> {
    const found = await challengeMessageCache.get(sessionId);
    if (found) return found;
    throw new VerifierException({
      code: VEC.VERIFY_NO_SESSION,
      msg: "Session with challenge message not found"
    });
  }

  function checkSubjectId(input: {
    provingResult: ProvingResultDto;
    expectedSubjectId: Identifier
  }) {
    const { provingResult, expectedSubjectId } = input;
    const actualSubjectId = (provingResult.publicInput?.credential as any)?.attributes?.subject?.id;
    if (!isEqualsIds(expectedSubjectId, actualSubjectId)) {
      throw new VerifierException({
        code: VEC.VERIFY_NOT_PASSED,
        msg: `Subject identifier from public input not matched`
      });
    }
  }

  function checkContextTime(provingResult: ProvingResultDto) {
    const contextNow = (provingResult.publicInput as any)?.context?.now;
    if (contextNow && new Date(contextNow).getTime() > new Date().getTime()) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Public input context now greater than current time`
      });
    }
  }

  function isEqualsIds(fst: Identifier, snd: Identifier | undefined) {
    return (fst.type === snd?.type && fst.key === snd?.key);
  }

  function getSessionIdFromQuery(
    req: FastifyRequest<{ Querystring: { [key: string]: unknown } }>
  ): string {
    if (!("sessionId" in req.query) || typeof req.query.sessionId !== "string") {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Bad verifier request. HTTP request URL must has "sessionId" in query string`
      });
    }
    return req.query.sessionId;
  }

  async function findSessionById(sessionId: string): Promise<ClientSession> {
    const foundSession = await clientSessionCache.get(sessionId);
    if (!foundSession) {
      throw new VerifierException({
        code: VEC.VERIFY_NO_SESSION,
        msg: `Can not find client session by id: ${sessionId}`
      });
    }
    return foundSession;
  }

  fastify.get("/api/v2/verifier-jwk.json", async () => {
    return publicJWK;
  });
}

