import { type DI } from "../app.js";
import { isProvingResult, Proposal } from "../types/index.js";
import { ChallengeMessage } from "../services/challenge-message.js";
import crypto from "node:crypto";
import { verifySignature } from "../services/signature-verifier.js";
import { ID_TYPES, isJsonZcredException, StrictId, VEC, zcredjs } from "@zcredjs/core";
import { VerifierException } from "../backbone/exception.js";
import { Injector } from "typed-inject";
import { createZkProofVerifier, getVerifiersIds } from "../services/verifiers-initialize.js";
import { IZkProofVerifier } from "../types/zk-proof-verifier.js";


export function VerifierController(injector: Injector<DI>) {

  const { fastify } = injector.resolve("httpServer");
  const mainProposer = injector.resolve("mainProposer");
  const mainHandler = injector.resolve("mainZcredResultHandler");
  const config = injector.resolve("config");
  const cacheClient = injector.resolve("cacheClient");

  const cache = cacheClient.createTtlCache<SessionData>({
    namespace: "verifier-ttl-cache",
  });
  const zkProofVerifierCache: Record<string, Promise<IZkProofVerifier>> = {};

  for (const verifierId of getVerifiersIds()) {

    fastify.post<{
      Body: SessionData["body"]
    }>(`/api/zcred/proposal/${verifierId}`, {
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
                    type: { enum: ID_TYPES },
                    key: { type: "string" }
                  }
                }
              }
            },
            clientSession: { type: "string" },
            redirectURL: { type: "string", format: "uri" },
            issuerAccessToken: { type: "string", nullable: true }
          }
        }
      }
    }, async (req) => {
      const subjectId = zcredjs.normalizeId(req.body.subject.id);
      req.body.subject.id = subjectId;
      const nonce = crypto.randomUUID();
      const verifierURL = new URL(`./zcred/verify/${verifierId}`, config.exposeDomain);
      verifierURL.searchParams.set("session", nonce);
      const message = ChallengeMessage.toMessage({
        verifierURL: verifierURL.href,
        nonce: nonce
      });
      await cache.set(nonce, {
        body: req.body,
        message: message
      }, 12 * 3600 * 1000 /* 12 hours */);
      const proposer = mainProposer.getProposer(verifierId);
      const subjectIdType = await proposer.getSubjectIdType();
      if (subjectId.type !== subjectIdType) throw new VerifierException({
        code: VEC.PROPOSAL_BAD_REQ,
        msg: `Bad request. Subject id type MUST be "${subjectIdType}"`
      });
      const [selector, jalProgram, comment] = await Promise.all([
        proposer.getSelector(subjectId),
        proposer.getJalProgram(),
        proposer.getComment()
      ]);
      if (!zkProofVerifierCache[verifierId]) {
        zkProofVerifierCache[verifierId] = createZkProofVerifier(jalProgram);
      }
      const proposal: Proposal = {
        verifierURL: verifierURL.href,
        challenge: {
          message: message
        },
        selector: selector,
        program: jalProgram,
        comment: comment,
        accessToken: req.body.issuerAccessToken
      };
      return proposal;
    });


    fastify.post<{
      Querystring: { [key: string]: unknown }
    }>(`/zcred/verify/${verifierId}`, {
      schema: { tags: [verifierId] }
    }, async (req) => {
      if (!("session" in req.query && typeof req.query.session === "string")) {
        throw new VerifierException({
          code: VEC.VERIFY_BAD_REQ,
          msg: `Bad verify request, "session" MUST be in search parameters`
        });
      }
      const sessionId = req.query.session;
      const session = await cache.get(sessionId);
      if (!session) throw new VerifierException({
        code: VEC.VERIFY_NO_SESSION,
        msg: `Can not find session with id: ${sessionId}`
      });
      const subjectId = session.body.subject.id;
      const handler = mainHandler.getResultHandler(verifierId);
      if (isJsonZcredException(req.body)) {
        const exception = req.body;
        const redirectURL = await handler.onException({
          exception: exception,
          subjectId: subjectId,
          session: session
        });
        await cache.delete(sessionId);
        return { redirectURL: redirectURL ? redirectURL.href : null };
      } else if (isProvingResult(req.body)) {
        const isSignVerified = await verifySignature({
          message: session.message,
          signature: req.body.signature,
          subject: session.body.subject
        });
        if (!isSignVerified) throw new VerifierException({
          code: VEC.VERIFY_INVALID_SIGNATURE,
          msg: `Invalid signature`
        });
        const proofVerifier = await getZkProofVerifier(verifierId);
        if (!proofVerifier) throw new VerifierException({
          code: VEC.VERIFY_BAD_REQ,
          msg: `ZK proof verifier with id ${verifierId} not found`
        });
        const isProofVerified = await proofVerifier.verify(req.body);
        if (!isProofVerified) throw new VerifierException({
          code: VEC.VERIFY_INVALID_PROOF,
          msg: `Invalid zk-proof`
        });
        const provingResult = req.body;
        const redirectURL = await handler.onSuccess({
          provingResult,
          subjectId,
          session: session
        });
        redirectURL.searchParams.set("clientSession", session.body.clientSession);
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
  }

  fastify.get("/public/html/verification/done.html", async (_, resp) => {
    await resp.sendFile(`html/verification/done.html`);
  });

  fastify.get("/public/html/verification/fail.html", async (_, resp) => {
    await resp.sendFile(`html/verification/fail.html`);
  });

  async function getZkProofVerifier(verifierId: string): Promise<IZkProofVerifier> {
    const promise = zkProofVerifierCache[verifierId];
    if (promise) {
      return promise;
    } else {
      const proposer = mainProposer.getProposer(verifierId);
      return createZkProofVerifier(await proposer.getJalProgram());
    }
  }
}

export function getHtmlURL(origin: URL, path: string[]) {
  const exposeDomain = origin.href;
  const pathname = `./public/html/${path.join("/")}`;
  return exposeDomain.endsWith("/")
    ? new URL(pathname, exposeDomain)
    : new URL(pathname, `${exposeDomain}/`);
}

export type SessionData = {
  body: {
    subject: {
      id: StrictId;
    },
    clientSession: string;
    redirectURL: string;
    issuerAccessToken?: string;
  } & { [key: string]: unknown };
  message: string;
}
