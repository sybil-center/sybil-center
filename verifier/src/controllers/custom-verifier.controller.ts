import { Injector } from "typed-inject";
import { DI } from "../app.js";
import {
  Identifier,
  isJsonZcredException,
  isStrictId,
  JsonZcredException,
  StrictId,
  VEC,
  zcredjs
} from "@zcredjs/core";
import { ChallengeMessage } from "../services/challenge-message.js";
import { isProvingResult, Proposal, ProvingResult } from "../types/index.js";
import { VerifierException } from "../backbone/exception.js";
import crypto from "node:crypto";
import { verifySignature } from "../services/signature-verifier.js";
import * as u8a from "uint8arrays";
import { VerificationResultEntity } from "../entities/verification-result.entity.js";
import sortKeys from "sort-keys";
import { stringifyZCredtId } from "../util/index.js";
import { SIWE_STATEMENT } from "../consts/index.js";

export type SessionData = {
  body: {
    subject: {
      id: StrictId;
    },
    clientSession: string;
    webhookURL?: string;
    redirectURL: string;
    issuer: {
      type: string;
      uri: string;
      accessToken?: string;
    };
  } & { [key: string]: unknown };
  message: string;
}

type SessionV2 = VerificationResultEntity["data"]["session"]


export function CustomVerifierController(injector: Injector<DI>) {

  const fastify = injector.resolve("httpServer").fastify;
  const verifierManager = injector.resolve("verifierManager");
  const config = injector.resolve("config");
  const provingResultService = injector.resolve("provingResultService");
  const verificationService = injector.resolve("verificationService");
  const siweService = injector.resolve("siweService");
  const cacheClient = injector.resolve("cacheClient");
  const jalCommentService = injector.resolve("jalCommentService");
  const cache = cacheClient.createTtlCache<SessionData>({
    namespace: "custom-verifier-ttl-cache",
  });
  const cacheV2 = cacheClient.createTtlCache<SessionV2>({
    namespace: "custom-verifier-ttl-cache-v2"
  });

  fastify.post<{
    Params: { jalId: string };
    Body: SessionData["body"]
  }>("/api/v1/verifier/:jalId/proposal", {
    schema: {
      body: {
        type: "object",
        required: ["subject", "clientSession"],
        additionalProperties: true,
        properties: {
          subject: {
            type: "object",
            required: ["id"],
            additionalProperties: true,
            properties: {
              id: {
                type: "object",
                required: ["type", "key"],
                properties: {
                  type: { type: "string" },
                  key: { type: "string" }
                }
              }
            }
          },
          clientSession: { type: "string" },
          redirectURL: { type: "string", format: "uri" },
          issuer: {
            type: "object",
            required: ["type", "uri"],
            properties: {
              type: { type: "string" },
              uri: { type: "string", format: "uri" },
              accessToken: { type: "string", nullable: true }
            }
          }
        }
      }
    }
  }, async (req) => {
    const jalId = req.params.jalId;
    const issuer = req.body.issuer;
    const subjectId = zcredjs.normalizeId(req.body.subject.id);
    req.body.subject.id = subjectId;
    const nonce = crypto.randomUUID();
    const verifierURL = new URL(`./api/v1/verifier/${jalId}/verify`, config.exposeDomain);
    verifierURL.searchParams.set("session", nonce);
    const message = ChallengeMessage.toMessage({
      verifierURL: verifierURL.href,
      nonce: nonce
    });
    await cache.set(nonce, {
      body: req.body,
      message: message
    }, 12 * 3600 * 1000 /* 12 hours */);
    const { program, selector } = await verifierManager.getProposal({
      jalId: jalId,
      subjectId: subjectId,
      metaIssuer: issuer
    });
    return {
      verifierURL: verifierURL.href,
      program: program,
      selector: selector,
      challenge: {
        message: message
      },
      accessToken: issuer.accessToken
    } satisfies Proposal;
  });

  fastify.post<{
    Querystring: { [key: string]: unknown },
    Params: { jalId: string },
  }>("/api/v1/verifier/:jalId/verify", async (req) => {
    if (!("session" in req.query && typeof req.query.session === "string")) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Bad verify request, "session" MUST be in search parameters`
      });
    }
    const jalId = req.params.jalId;
    const sessionId = req.query.session;
    const session = await cache.get(sessionId);
    if (!session) throw new VerifierException({
      code: VEC.VERIFY_NO_SESSION,
      msg: `Can not find session with id: ${sessionId}`
    });
    if (isJsonZcredException(req.body)) {
      const exception = req.body;
      const redirectURL = new URL(session.body.redirectURL);
      await cache.delete(sessionId);
      redirectURL.searchParams.set("clientSession", session.body.clientSession);
      redirectURL.searchParams.set("status", "exception");
      redirectURL.searchParams.set("exceptionCode", String(exception.code));
      return { redirectURL: redirectURL };
    } else if (isProvingResult(req.body)) {
      const expectedSubjectId = session.body.subject.id;
      checkSubjectId({ provingResult: req.body, expectedSubjectId });
      checkContextTime(req.body);
      await checkSignature({
        message: session.message,
        signature: req.body.signature,
        subject: session.body.subject
      });
      const isProofVerified = await verifierManager.verify({
        jalId: jalId,
        provingResult: req.body
      });
      if (!isProofVerified) throw new VerifierException({
        code: VEC.VERIFY_INVALID_PROOF,
        msg: `Invalid zk-proof`
      });
      const { id: provingResultId } = await provingResultService.save({
        provingResult: req.body,
        jalId: jalId
      });
      const redirectURL = new URL(session.body.redirectURL);
      redirectURL.searchParams.set("clientSession", session.body.clientSession);
      redirectURL.searchParams.set("status", "success");
      redirectURL.searchParams.set(
        "provingResultURL",
        new URL(`/api/v1/proving-result/${provingResultId}`, config.exposeDomain).href
      );
      await cache.delete(sessionId);
      return {
        redirectURL: redirectURL.href
      };
    }
    throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ,
      msg: "Bad request to verifier"
    });
  });


  fastify.post<{
    Params: { jalId: string };
    Body: Omit<SessionV2, "id" | "challenge" | "jalId">
  }>("/api/v2/verifier/:jalId/proposal", {
    schema: {
      body: {
        type: "object",
        required: ["subject", "client"],
        additionalProperties: true,
        properties: {
          subject: {
            type: "object",
            required: ["id"],
            additionalProperties: true,
            properties: {
              id: {
                type: "object",
                required: ["type", "key"],
                properties: {
                  type: { type: "string" },
                  key: { type: "string" }
                }
              }
            }
          },
          client: {
            type: "object",
            required: ["session", "siwe"],
            properties: {
              session: { type: "string" },
              siwe: {
                type: "object",
                required: ["message", "signature"],
                properties: {
                  message: { type: "string" },
                  signature: { type: "string" }
                }
              }
            }
          },
          redirectURL: { type: "string", format: "uri" },
          issuer: {
            type: "object",
            required: ["type", "uri"],
            properties: {
              type: { type: "string" },
              uri: { type: "string", format: "uri" },
              accessToken: { type: "string", nullable: true }
            }
          }
        }
      }
    }
  }, async (req) => {
    const jalId = req.params.jalId;
    const issuer = req.body.issuer;
    const subjectId = normalizeSubjectId(req.body.subject.id);
    req.body.subject.id = subjectId;
    const sessionId = toSessionId(req.body);
    const verifierURL = new URL(`./api/v2/verifier/${jalId}/verify`, config.exposeDomain);
    verifierURL.searchParams.set("session", sessionId);
    const challengeMessage = ChallengeMessage.toMessage({
      verifierURL: verifierURL.href,
      nonce: sessionId
    });
    const foundSession = await cacheV2.get(sessionId);
    if (!foundSession) {
      await cacheV2.set(sessionId, {
        id: sessionId,
        challenge: {
          message: challengeMessage
        },
        jalId: jalId,
        ...req.body
      }, 12 * 3600 * 1000 /* 12 hours */);
    }
    const { subject } = await siweService.verify({
      message: req.body.client.siwe.message,
      signature: req.body.client.siwe.signature
    }, { statement: SIWE_STATEMENT.GET_PROPOSAL });
    const foundComment = await jalCommentService.getOne({
      jalId: jalId,
      subjectId: stringifyZCredtId(subject.id)
    });
    const { program, selector } = await verifierManager.getProposal({
      jalId: jalId,
      subjectId: subjectId,
      metaIssuer: issuer
    });
    return {
      verifierURL: verifierURL.href,
      program: program,
      selector: selector,
      comment: foundComment?.comment,
      challenge: {
        message: challengeMessage
      },
      accessToken: issuer!.accessToken
    } satisfies Proposal;
  });

  fastify.post<{
    Querystring: { [key: string]: unknown },
    Params: { jalId: string },
  }>("/api/v2/verifier/:jalId/verify", async (req) => {
    if (!("session" in req.query && typeof req.query.session === "string")) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Bad verify request, "session" MUST be in search parameters`
      });
    }
    const sessionId = req.query.session;
    const session = await findSessionV2(sessionId);
    if (isJsonZcredException(req.body)) {
      const exception = req.body;
      return onException(exception, session);
    } else if (isProvingResult(req.body)) {
      const provingResult = req.body;
      return onSuccess(provingResult, session);
    }
    throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ
    });

  });

  async function onSuccess(
    provingResult: ProvingResult,
    session: SessionV2
  ): Promise<{ redirectURL: string }> {
    const expectedSubjectId = session.subject.id;
    checkSubjectId({ provingResult: provingResult, expectedSubjectId });
    checkContextTime(provingResult);
    const { ok, id, zcredCode } = await verificationService.verifyAndSave({
      data: {
        provingResult: {
          ...provingResult,
          message: session.challenge.message
        },
        session: session
      },
      jalId: session.jalId
    });
    const redirectURL = new URL(session.redirectURL);
    redirectURL.searchParams.set("clientSession", session.client.session);
    if (ok) {
      redirectURL.searchParams.set("status", "success");
      redirectURL.searchParams.set("verificationResultId", id!);
      await cache.delete(session.id);
      return { redirectURL: redirectURL.href };
    }
    redirectURL.searchParams.set("status", "exception");
    redirectURL.searchParams.set("exceptionCode", String(zcredCode!));
    return { redirectURL: redirectURL.href };
  }

  async function onException(
    exception: JsonZcredException,
    session: SessionV2
  ): Promise<{ redirectURL: string }> {
    const redirectURL = new URL(session.redirectURL);
    await cacheV2.delete(session.id);
    await verificationService.save({
      data: {
        exception: exception,
        session: session
      },
      jalId: session.jalId
    });
    redirectURL.searchParams.set("clientSession", session.client.session);
    redirectURL.searchParams.set("status", "exception");
    redirectURL.searchParams.set("exceptionCode", String(exception.code));
    return { redirectURL: redirectURL.href };
  }

  function toSessionId<T extends Record<string, any>>(o: T): string {
    const sorted = sortKeys(o, { deep: true });
    return crypto.createHash("sha256")
      .update(u8a.fromString(JSON.stringify(sorted)))
      .digest("base64url");
  }

  function normalizeSubjectId(id: Identifier) {
    if (isStrictId(id)) {
      return zcredjs.normalizeId(id);
    }
    return id;
  }

  function checkContextTime(provingResult: ProvingResult) {
    const contextNow = (provingResult.publicInput as any)?.context?.now;
    if (contextNow && new Date(contextNow).getTime() > new Date().getTime()) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Public input context now greater than current time`
      });
    }
  }

  async function findSessionV2(id: string): Promise<SessionV2> {
    const session = await cacheV2.get(id);
    if (!session) throw new VerifierException({
      code: VEC.VERIFY_NO_SESSION,
      msg: `Can not find session with id: ${id}`
    });
    return session;
  }

  function checkSubjectId(o: {
    provingResult: ProvingResult,
    expectedSubjectId: Identifier
  }) {
    const actualSubjectId = (o.provingResult.publicInput?.credential as any)?.attributes?.subject?.id;
    if (!isEqualsIds(o.expectedSubjectId, actualSubjectId)) {
      throw new VerifierException({
        code: VEC.VERIFY_NOT_PASSED,
        msg: `Subject identifier from public input not matched`
      });
    }
  }

  async function checkSignature(o: {
    message: string;
    signature: string;
    subject: {
      id: Identifier;
    }
  }) {
    const isSignVerified = await verifySignature({
      message: o.message,
      signature: o.signature,
      subject: o.subject
    });
    if (!isSignVerified) throw new VerifierException({
      code: VEC.VERIFY_INVALID_SIGNATURE,
      msg: `Invalid signature`
    });
  }
}


function isEqualsIds(fst: Identifier, snd: Identifier | undefined) {
  return (fst.type === snd?.type && fst.key === snd?.key);
}