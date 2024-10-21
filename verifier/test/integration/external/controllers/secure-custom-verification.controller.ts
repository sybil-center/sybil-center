import { suite } from "uvu";
import dotenv from "dotenv";
import { PATH_TO_CONFIG, testUtil } from "../../../test-util/index.js";
import { App } from "../../../../src/app.js";
import { FastifyInstance } from "fastify";
import { Config } from "../../../../src/backbone/config.js";
import { DbClient } from "../../../../src/backbone/db-client.js";
import { ProvingResultEntity } from "../../../../src/models/entities/proving-result.entity.js";
import { JalCommentEntity } from "../../../../src/models/entities/jal-comment.entity.js";
import { VerificationResultEntity } from "../../../../src/models/entities/verification-result.entity.js";
import { JalEntity } from "../../../../src/models/entities/jal.entity.js";
import { KeyvEntity } from "../../../../src/models/entities/keyv.entity.js";
import { assert, Const, equal, greaterOrEqual, mul, Static, sub, toJAL } from "@jaljs/js-zcred";
import { O1GraphLink } from "o1js-trgraph";
import * as jose from "jose";
import { DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA } from "@sybil-center/passport";
import { TestHttpClient } from "../../../test-util/http-client.js";
import * as a from "uvu/assert";
import * as u8a from "uint8arrays";
import { InitClientSessionRespDto } from "../../../../src/models/dtos/init-client-session-resp.dto.js";
import { Proposal } from "../../../../src/types/index.js";
import * as o1js from "o1js";
import { InputTransformer } from "@jaljs/core";
import { ProvingResultDto } from "../../../../src/models/dtos/proving-result.dto.js";
import { Value } from "@sinclair/typebox/value";
import { VerificationResultRespDto, } from "../../../../src/models/dtos/verification-result-resp.dto.js";
import sortKeys from "sort-keys";
import { VERIFIER_STATEMENT } from "../../../../src/consts/index.js";
import { Es256kJwk } from "../../../../src/services/jws.verifier.service.js";
import { JsonZcredException, SEC } from "@zcredjs/core";
import { Page } from "../../../../src/stores/abstract.store.js";
import { VerificationResultPageResponseDto } from "../../../../src/controllers/verification-result.controller.js";
import { ZcredVerifierManager } from "../../../../src/services/zcred-verifier-manager.js";

const test = suite("Test secure custom verifier controller");

let app: App;
let fastify: FastifyInstance;
let config: Config;
let db: DbClient["db"];
let httpClient: TestHttpClient;
let zcredVerifierManager: ZcredVerifierManager;

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
  db = app.context.resolve("dbClient").db;
  httpClient = new testUtil.HttpClient(fastify);
  zcredVerifierManager = app.context.resolve("zcredVerifierManager");
});

test.after(async () => {
  await db.delete(ProvingResultEntity).execute();
  await db.delete(JalCommentEntity).execute();
  await db.delete(VerificationResultEntity).execute();
  await db.delete(JalEntity).execute();
  await db.delete(KeyvEntity).execute();
  await app.close();
});

test("success flow", async () => {
  const { jalId } = await createClientJalProgram();
  const { sessionId } = await initClientSession(jalId);
  const proposal = await getProposal({
    jalId: jalId,
    sessionId: sessionId
  });
  const provingResul = await createProvingResult({
    credential: testUtil.creds.SybilPassportEth,
    signMessage: testUtil.ethereum.signMessage,
    proposal: proposal,
    jalId: jalId
  });
  const verificationBody = await getVerificationResult({
    result: provingResul,
    jalId: jalId,
    sessionId: sessionId
  });
  const verificationResultId = verificationBody.sendBody.verificationResultId;
  a.equal(verificationBody.sendBody, {
    sessionId: sessionId,
    jalId: jalId,
    verificationResultId: verificationBody.sendBody.verificationResultId,
    result: provingResul,
    jalURL: new URL(`/api/v1/jal/${jalId}`, config.exposeDomain).href,
    verificationResultURL: new URL(`/api/v2/verification-result/${verificationResultId}`, config.exposeDomain).href,
    status: "success"
  } satisfies VerificationResultRespDto["sendBody"], `Verification resp body "sendBody" is not match`);
  await checkVerificationRespBody({
    verificationBody: verificationBody,
    sessionId: sessionId
  });
  a.ok(
    Value.Check(ProvingResultDto, verificationBody.sendBody.result),
    `Verification body "sendBody.result" is not proving result`
  );
  const verificationResultURL = new URL(verificationBody.sendBody.verificationResultURL);
  const verificationResultJWS = await testUtil.createClientJWS({
    origin: config.exposeDomain.href,
    statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT
  });
  const verificationResultResp = await httpClient.getVerificationResultByPath({
    path: verificationResultURL.pathname + verificationResultURL.search,
    jws: verificationResultJWS
  });
  a.is(
    verificationResultResp.statusCode, 200,
    `Verification result response status code is not 200. Body: ${verificationResultResp.body}`
  );
  const verificationResult = JSON.parse(verificationResultResp.body) as VerificationResultEntity;
  a.ok(verificationResult.data?.provingResult, `No proving result in verification result data`);
  a.equal(
    verificationResult.data.provingResult, verificationBody.sendBody.result,
    `Verification result "data.provingResult" not match to verificationBody "sendBody.result"`
  );
  const pageResp = await httpClient.getVerificationResultPage({
    jws: await testUtil.createClientJWS({
      statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT,
      origin: config.exposeDomain.href
    }),
    filter: {
      id: verificationBody.sendBody.verificationResultId
    },
  });
  a.is(
    pageResp.statusCode, 200,
    `Verification result page status resp is not 200. Resp body ${pageResp.body}`
  );
  const page = JSON.parse(pageResp.body) as Page<VerificationResultEntity>;
  a.is(
    page.result[0]?.id, verificationBody.sendBody.verificationResultId,
    `Verification result page first result id is not match`
  );
  a.is(
    page.result[0]?.status, "success", `Result status from page is not "success"`
  );
  const bySubjectIdResp = await httpClient.getVerificationResultPage({
    jws: await testUtil.createClientJWS({
      statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT,
      origin: config.exposeDomain.href
    }),
    filter: {
      subjectId: {
        type: "ethereum:address",
        key: testUtil.ethereum.address.toLowerCase()
      }
    }
  });
  const pageBySubjectId = await bySubjectIdResp.json() as VerificationResultPageResponseDto;
  a.ok(pageBySubjectId, "Page by subjectId not found");
  a.equal(pageBySubjectId.result[0]!.subjectId, {
    type: "ethereum:address",
    key: testUtil.ethereum.address.toLowerCase()
  });
});

test("verification exception", async () => {
  const { jalId } = await createClientJalProgram();
  const { sessionId } = await initClientSession(jalId);
  const proposal = await getProposal({
    jalId: jalId,
    sessionId: sessionId
  });
  const exception: JsonZcredException = {
    code: SEC.REJECT,
    message: "Reject"
  };
  const exceptionResp = await httpClient.verificationException({
    sessionId: sessionId,
    jalId: jalId,
    exception: exception,
    challengeMessage: proposal.challenge.message
  });
  a.is(
    exceptionResp.statusCode, 200,
    `Exception response status code is not 200. Body: ${exceptionResp.body}`
  );
  const result = JSON.parse(exceptionResp.body);
  a.ok(
    Value.Check(VerificationResultRespDto, result),
    `Invalid verification result response body`
  );
  await checkVerificationRespBody({
    verificationBody: result,
    sessionId: sessionId
  });
  a.equal(
    result.sendBody, {
      jalId: jalId,
      jalURL: result.sendBody.jalURL,
      sessionId: sessionId,
      verificationResultId: result.sendBody.verificationResultId,
      verificationResultURL: result.sendBody.verificationResultURL,
      result: exception,
      status: "exception"
    } satisfies VerificationResultRespDto["sendBody"]
  );
  a.is(
    new URL(result.redirectURL).searchParams.get("verified"), "false",
    `Redirect url search param "verified" MUST be "false"`
  );
  a.is(result.webhookURL, WEBHOOK_URL.href);
  const pageResp = await httpClient.getVerificationResultPage({
    jws: await testUtil.createClientJWS({
      statement: VERIFIER_STATEMENT.GET_VERIFICATION_RESULT,
      origin: config.exposeDomain.href
    }),
    filter: {
      id: result.sendBody.verificationResultId
    },
  });
  a.is(
    pageResp.statusCode, 200,
    `Verification result page status resp is not 200. Resp body ${pageResp.body}`
  );
  const page = JSON.parse(pageResp.body) as Page<VerificationResultEntity>;
  a.is(
    page.result[0]?.id, result.sendBody.verificationResultId,
    `Verification result page first result id is not match`
  );
  a.is(
    page.result[0]?.status, "exception", `Result status from page is not "success"`
  );
});

const REDIRECT_URL = new URL("https://example.com");
const WEBHOOK_URL = new URL("https://webhook.com");
const CRED_HOLDER_URL = new URL("https://zcred.me");
const ISSUER_URI = new URL("https://sybil.center");

async function checkVerificationRespBody(input: {
  verificationBody: VerificationResultRespDto;
  sessionId: string;
}) {
  const { verificationBody, sessionId } = input;
  const detachedJWS = verificationBody.jws;
  const strPayload = JSON.stringify(sortKeys(verificationBody.sendBody, { deep: true }));
  const jwsPayload = Buffer.from(new TextEncoder().encode(strPayload)).toString("base64url");
  const jwsSplit = detachedJWS.split(".");
  const jwsHeader = jwsSplit[0];
  const jws = `${jwsHeader}.${jwsPayload}.${jwsSplit[2]}`;
  a.ok(jwsHeader, `Jws header is not specified`);
  const jwsDecodeHeader = JSON.parse(u8a.toString(u8a.fromString(jwsHeader, "base64url"))) as {
    alg: string;
    kid: string
  };
  const jwkResp = await fastify.inject({
    method: "GET",
    path: new URL(jwsDecodeHeader.kid).pathname
  });
  a.is(jwkResp.statusCode, 200, `Get JWK response status code is not 200`);
  const jwk = JSON.parse(jwkResp.body) as Es256kJwk;
  const { payload: payloadBytes } = await jose.compactVerify(jws, await jose.importJWK(jwk));
  const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  a.equal(
    verificationBody.sendBody, payload,
    `JWS payload not match with "sendBody" from verification result response body`
  );
  const redirectURL = new URL(verificationBody.redirectURL);
  a.is(
    redirectURL.searchParams.get("sessionId"), sessionId,
    `Verification result response body does not contains "sessionId" in "redirectURL" as search param`
  );
  a.ok(
    redirectURL.searchParams.get("verificationResultId"),
    `Verification result response body does not contains "verificationResultId" in "redirectURL" as search param`
  );
  a.is(
    redirectURL.origin + redirectURL.pathname, REDIRECT_URL.origin + REDIRECT_URL.pathname,
    `Verification resp body "redirectURL" is not match`
  );
}

async function getVerificationResult(input: {
  jalId: string;
  result: ProvingResultDto;
  sessionId: string;
}): Promise<VerificationResultRespDto> {
  const { jalId, result, sessionId } = input;
  const verificationResp = await httpClient.completeVerification({
    result: result,
    jalId: jalId,
    sessionId: sessionId
  });
  a.is(
    verificationResp.statusCode, 200,
    `Complete verification status code is not 200. Body: ${verificationResp.body}`
  );
  return JSON.parse(verificationResp.body) as VerificationResultRespDto;
}

async function getProposal(input: {
  jalId: string;
  sessionId: string
}): Promise<Proposal> {
  const { jalId, sessionId } = input;
  const proposalResp = await httpClient.getVerificationProposal({
    sessionId: sessionId,
    jalId: jalId
  });
  a.is(
    proposalResp.statusCode, 200,
    `Proposal resp status code is not 200. Body: ${proposalResp}`
  );
  const proposal = JSON.parse(proposalResp.body) as Proposal;
  a.is(proposal.comment, JAL_COMMENT, `Proposal comment not match`);
  const verifierURL = new URL(proposal.verifierURL);
  a.is(
    verifierURL.searchParams.get("sessionId"), sessionId,
    `Proposal "verifierURL" does not contain "sessionId" as search param`
  );
  return proposal;
}

async function createProvingResult(input: {
  credential: Record<string, any>;
  proposal: Proposal;
  signMessage: (message: string) => Promise<string>;
  jalId: string;
}): Promise<ProvingResultDto> {
  const { credential, proposal, signMessage } = input;
  const meta = await zcredVerifierManager.getO1JSZkProgramMeta(input.jalId);
  if (!meta) throw Error(`o1js zk program not found by jalId: ${input.jalId}`);
  const { zkProgram, PublicInput, verificationKey } = meta;
  const setup = {
    private: {
      credential: credential,
    },
    public: {
      context: {
        now: new Date().toISOString()
      }
    }
  };
  const transformedInput = testUtil.o1js.zkInputTransformer.transform(setup, proposal.program.inputSchema);
  const jsonProof = await zkProgram.execute(
    new PublicInput(transformedInput.public),
    ...transformedInput.private
  ).then((proof) => proof.toJSON());
  a.is(
    await o1js.verify(jsonProof, verificationKey.data), true,
    `Proof is not verified`
  );
  const hexSignature = await signMessage(proposal.challenge.message);
  const signature = u8a.toString(u8a.fromString(hexSignature.substring(2), "hex"), "base58btc");

  // Build proving result
  const originInput = new InputTransformer(
    proposal.program.inputSchema,
    testUtil.o1js.trgraph
  ).toInput(setup);

  return {
    signature: signature,
    message: proposal.challenge.message,
    proof: jsonProof.proof,
    publicInput: originInput["public"],
    verificationKey: verificationKey.data
  } satisfies ProvingResultDto;
}

async function initClientSession(jalId: string) {
  const initSessionJWS = await testUtil.createClientJWS({
    statement: VERIFIER_STATEMENT.CREATE_SESSION,
    origin: config.exposeDomain.href
  });
  const initSessionResp = await httpClient.initVerificationSession({
    jalId: jalId,
    clientSession: {
      subject: {
        id: {
          type: "ethereum:address",
          key: testUtil.ethereum.address
        }
      },
      issuer: {
        type: "http",
        uri: ISSUER_URI.href
      },
      redirectURL: REDIRECT_URL.href,
      webhookURL: WEBHOOK_URL.href,
      credentialHolderURL: CRED_HOLDER_URL.href
    },
    jws: initSessionJWS
  });
  a.is(
    initSessionResp.statusCode, 201,
    `Init session resp status code is not 201, Body: ${initSessionResp.body}`
  );
  const { verifyURL: verifyURLStr } = JSON.parse(initSessionResp.body) as InitClientSessionRespDto;
  const verifyURL = new URL(verifyURLStr);
  a.ok(
    verifyURL.searchParams.get("proposalURL"),
    `Init session "verifyURL" MUST has "proposalURL" as query param`
  );
  a.is(verifyURL.origin, CRED_HOLDER_URL.origin, `Credential holder URL not matched`);
  const proposalURL = new URL(verifyURL.searchParams.get("proposalURL")!);
  a.is(
    proposalURL.pathname, `/api/v2/verifier/${jalId}/proposal`,
    `Proposal URL path name not match`
  );
  a.ok(
    proposalURL.searchParams.get("sessionId"),
    `proposalURL MUST has "sessionId" as query param`
  );
  const sessionId = proposalURL.searchParams.get("sessionId")!;
  return { verifyURL, proposalURL, sessionId };
}

async function createClientJalProgram(): Promise<{ jalId: string }> {
  const createJalJWS = await testUtil.createClientJWS({
    statement: VERIFIER_STATEMENT.CREATE_JAL,
    origin: config.exposeDomain.href
  });
  const createJalResp = await httpClient.createClientJalProgram({
    jalProgram: jal,
    comment: JAL_COMMENT,
    jws: createJalJWS
  });
  a.is(
    createJalResp.statusCode, 201,
    `Create client jal resp status code is not 200. ${createJalResp.body}`
  );
  const { id: jalId } = JSON.parse(createJalResp.body) as { id: string };
  return { jalId };
}

const JAL_COMMENT = "Passport jal program";

const {
  credential,
  context
} = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
const attributes = credential.attributes;
const jal = toJAL({
  target: "o1js:zk-program.cjs",
  credential: credential,
  publicInput: [
    attributes.document.sybilId,
    context.now
  ],
  commands: [
    assert(
      greaterOrEqual(
        sub(context.now, attributes.subject.birthDate),
        mul(Static<O1GraphLink>(18, ["uint64-mina:field"]), Const("year"))
      )
    ),
    assert(
      equal(
        attributes.countryCode,
        Static("GBR", ["iso3166alpha3-iso3166numeric", "iso3166numeric-uint16", "uint16-mina:field"])
      )
    ),
    assert(
      greaterOrEqual(attributes.validUntil, context.now)
    )
  ],
  options: {
    signAlgorithm: "mina:pasta",
    hashAlgorithm: "mina:poseidon"
  }
});

test.run();