import { type DI } from "../app.js";
import { isProvingResult, Proposal } from "../types/index.js";
import { ChallengeMessage } from "../services/challenge-message.js";
import crypto from "node:crypto";
import { verifySignature } from "../services/signature-verifier.js";
import { ID_TYPES, IdType, isJsonZcredException, VEC, zcredjs } from "@zcredjs/core";
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

  const cache = cacheClient.createTtlCache<CacheValue>({
    namespace: "verifier-ttl-cache",
  });
  const zkProofVerifierCache: Record<string, Promise<IZkProofVerifier>> = {};

  for (const verifierId of getVerifiersIds()) {

    fastify.get<{
      Querystring: {
        "subject.id.key": string;
        "subject.id.type": IdType;
        "verifier-id": string;
      } & { [key: string]: string | undefined }
    }>(`/api/zcred/proposal/${verifierId}`,
      {
        schema: {
          tags: [`${verifierId}`],
          querystring: {
            type: "object",
            required: ["subject.id.key", "subject.id.type"],
            properties: {
              "subject.id.key": { type: "string" },
              "subject.id.type": { enum: ID_TYPES },
            },
            additionalProperties: true
          }
        }
      },
      async (req) => {
        const subjectId = zcredjs.normalizeId({
          key: req.query["subject.id.key"],
          type: req.query["subject.id.type"]
        });
        const nonce = crypto.randomUUID();
        const verifierURL = new URL(`./zcred/verify/${verifierId}`, config.exposeDomain);
        verifierURL.searchParams.set("session", nonce);
        for (const key of Object.keys(req.query)) {
          verifierURL.searchParams.set(key, String(req.query[key]));
        }
        const message = ChallengeMessage.toMessage({
          verifierURL: verifierURL.href,
          nonce: nonce
        });
        await cache.set(nonce, {
          message,
          nonce,
          verifierId,
          subject: { id: subjectId }
        }, 12 * 3600 * 1000 /* 12 hours */);
        const proposer = mainProposer.getProposer(verifierId);
        const subjectIdType = await proposer.getSubjectIdType();
        if (subjectId.type !== subjectIdType) throw new VerifierException({
          code: VEC.PROPOSAL_BAD_REQ,
          msg: `Bad request. Subject id type MUST be "${subjectIdType}"`
        });
        const [accessToken, selector, jalProgram, comment] = await Promise.all([
          proposer.getAccessToken(),
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
          accessToken: accessToken
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
      const session = req.query.session;
      const cacheValue = await cache.get(session);
      if (!cacheValue) throw new VerifierException({
        code: VEC.VERIFY_NO_SESSION,
        msg: `Can not find session with id: ${session}`
      });
      const subjectId = cacheValue.subject.id;
      const handler = mainHandler.getResultHandler(verifierId);
      if (isJsonZcredException(req.body)) {
        const exception = req.body;
        const redirectURL = await handler.onException({ exception, subjectId, req });
        await cache.delete(session);
        return { redirectURL: redirectURL ? redirectURL.href : null };
      } else if (isProvingResult(req.body)) {
        const isSignVerified = await verifySignature({
          message: cacheValue.message,
          signature: req.body.signature,
          subject: cacheValue.subject
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
        const redirectURL = await handler.onSuccess({ provingResult, subjectId, req });
        await cache.delete(session);
        for (const key of Object.keys(req.query)) {
          redirectURL.searchParams.set(key, String(req.query[key]));
        }
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

type CacheValue = {
  nonce: string;
  message: string;
  subject: {
    id: { type: IdType; key: string }
  },
  verifierId: string;
}
