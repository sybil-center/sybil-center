import { Injector } from "typed-inject";
import { DI } from "../app.js";
import { Identifier, isJsonZcredException, StrictId, VEC, zcredjs } from "@zcredjs/core";
import { ChallengeMessage } from "../services/challenge-message.js";
import { isProvingResult, Proposal, ProvingResult } from "../types/index.js";
import { VerifierException } from "../backbone/exception.js";
import crypto from "node:crypto";
import { verifySignature } from "../services/signature-verifier.js";

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

export function CustomVerifierController(injector: Injector<DI>) {

  const fastify = injector.resolve("httpServer").fastify;
  const verifierManager = injector.resolve("zcredVerifierManager");
  const config = injector.resolve("config");
  const provingResultService = injector.resolve("provingResultService");
  const cacheClient = injector.resolve("cacheClient");
  const cache = cacheClient.createTtlCache<SessionData>({
    namespace: "custom-verifier-ttl-cache",
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

  function checkContextTime(provingResult: ProvingResult) {
    const contextNow = (provingResult.publicInput as any)?.context?.now;
    if (contextNow && new Date(contextNow).getTime() > new Date().getTime()) {
      throw new VerifierException({
        code: VEC.VERIFY_BAD_REQ,
        msg: `Public input context now greater than current time`
      });
    }
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