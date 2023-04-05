import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon, { stub } from "sinon";
import { oauthCallbackEP } from "../../../src/util/route.util.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";
import * as url from "url";
import { isValidVC } from "../../../src/util/credential.utils.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { ethereumSupport } from "../../support/ethereum.js";
import { LightMyRequestResponse } from "fastify";
import { solanaSupport } from "../../support/solana.js";
import { bitcoinSupport } from "../../support/bitcoin.js";
import { CanIssueResp, TwitterAccountChallenge, TwitterAccountVC } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../src/util/model.util.js";

const test = suite("Integration: Issue Twitter account ownership vc");

let app: App;

const redirectUrl = "https://example.com/";
const code = "code";
const accessToken = "access_token";
const twitterUsername = `test-${Math.floor(Math.random() * 1000)}`;

test.before(async () => {
  const config = new URL("../../test.env", import.meta.url);
  configDotEnv({ path: config, override: true });

  app = new App();
  await app.init();

  const issuer = app.context.resolve("twitterAccountIssuer");
  const twitterService = issuer.twitterService;
  const twitterApi = twitterService.twitterApi;

  stub(twitterApi, "loginWithOAuth2").resolves({
    accessToken: accessToken,
    client: twitterApi,
    expiresIn: 0,
    refreshToken: "",
    scope: []
  });
  stub(twitterService, "getUser").resolves({
    id: "test",
    username: twitterUsername
  });
});

test.after(async () => {
  sinon.restore();
  await app.close();
});

type PreIssueArgs = {
  publicId: string,
  custom?: AnyObj;
  expirationDate?: Date;
}

const preIssue = async (
  args: PreIssueArgs
): Promise<{ issueChallenge: string; sessionId: string }> => {
  const { fastify } = app.context.resolve("httpServer");
  await fastify.ready();
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("TwitterAccount"),
    payload: {
      publicId: args.publicId,
      redirectUrl: redirectUrl,
      custom: args.custom,
      expirationDate: args.expirationDate
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge status code is not 200. error: ${challengeResp.body}`
  );
  const {
    authUrl,
    issueChallenge,
    sessionId
  } = JSON.parse(challengeResp.body) as TwitterAccountChallenge;
  const { query } = url.parse(authUrl, true);
  const state = query.state as string;
  a.type(state, "string");

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("TwitterAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueBeforeResp.statusCode, 200,
    `can issue before callback resp fail. error: ${canIssueBeforeResp.body}`
  );
  const { canIssue: canIssueBefore } =
    JSON.parse(canIssueBeforeResp.body) as CanIssueResp;
  a.is(
    canIssueBefore, false,
    "can issue before callback is not false"
  );
  const callbackResp = await fastify.inject({
    method: "GET",
    url: oauthCallbackEP(),
    query: {
      code: code,
      state: state
    }
  });
  a.is(
    callbackResp.statusCode, 302,
    `callback response fail. error: ${callbackResp.body}`
  );
  const redirectTo = callbackResp.headers.location as string;
  a.is(redirectTo, redirectUrl, "redirect url is not matched");

  const canIssueAfterResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("TwitterAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueAfterResp.statusCode, 200,
    `can issue after callback resp fail. error ${canIssueAfterResp.body}`
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueAfterResp.body) as CanIssueResp;
  a.is(
    canIssueAfter, true,
    "can issue after callback is not true"
  );
  return {
    issueChallenge: issueChallenge,
    sessionId: sessionId
  };
};

type AssertIssueRespArgs = {
  issueResp: LightMyRequestResponse;
  subjectDID: string;
}

const assertIssueResp = async (args: AssertIssueRespArgs) => {
  const { issueResp, subjectDID } = args;
  const issuerDID = app.context.resolve("didService").id;
  a.is(
    issueResp.statusCode, 200,
    `credential response status code is not 200. error: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body) as TwitterAccountVC;
  const { id, twitter } = credential.credentialSubject;
  a.is(
    credential.issuer.id, issuerDID,
    "issuer id is not matched"
  );
  a.is(
    credential.type[0], "VerifiableCredential",
    "first item credential type is not matched"
  );
  a.is(
    credential.type[1], "TwitterAccount",
    "second item credential type is not matched"
  );
  a.is(subjectDID, id, "credential subject id no matched");
  a.is(twitterUsername, twitter.username, "twitter username not matched");
  a.is(twitter.id, "test", "twitter user id not matched");
  a.is(await isValidVC(credential), true, "vc is invalid");
};

const assertSessionDeleted = (sessionId: string) => {
  const { sessionCache } = app.context.resolve("twitterAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session cache is not deleted after issue");
};

test("should issue Twitter ownership credential with eth did-pkh", async () => {
  const {
    didPkhPrefix: ethDidPkhPrefix,
    didPkh: subjectDID,
    address: ethAddress
  } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;

  const { issueChallenge, sessionId } = await preIssue({ publicId: ethAddress });
  const signature = await ethereumSupport.sign(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      sessionId: sessionId,
      signType: ethDidPkhPrefix,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
});

test("should issue Twitter ownership credential with bitcoin did-pkh", async () => {
  const {
    didPkhPrefix: bitcoinDidPkhPrefix,
    didPkh: subjectDID,
    address: bitcoinAddress
  } = bitcoinSupport.info;

  const { fastify } = app.context.resolve("httpServer");
  const { issueChallenge, sessionId } = await preIssue({ publicId: bitcoinAddress });
  const signature = await bitcoinSupport.sing(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      sessionId: sessionId,
      signType: bitcoinDidPkhPrefix,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
});

test("should issue Twitter ownership credential with solana did-pkh", async () => {
  const {
    didPkhPrefix: solanaDidPkhPrefix,
    didPkh: subjectDID,
    address: solanaAddress
  } = solanaSupport.info;

  const { fastify } = app.context.resolve("httpServer");
  const { issueChallenge, sessionId } = await preIssue({ publicId: solanaAddress });
  const signature = await solanaSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      sessionId: sessionId,
      signType: solanaDidPkhPrefix,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
});

test("should redirect to default page after authorization", async () => {
  const { address: ethAddress } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const challengeResp = await fastify.inject({
    method: "POST",
    path: challengeEP("TwitterAccount"),
    payload: {
      publicId: ethAddress
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge response fail. error: ${challengeResp.body}`
  );
  const { authUrl } = JSON.parse(challengeResp.body) as TwitterAccountChallenge;
  const { query } = url.parse(authUrl, true);
  const state = query.state as string;
  a.type(state, "string");

  const callbackResp = await fastify.inject({
    method: "GET",
    url: oauthCallbackEP(),
    query: {
      code: code,
      state: state
    }
  });
  a.is(
    callbackResp.statusCode, 302,
    `callback status code fail. error: ${callbackResp.body}`
  );
  const defaultRedirectUrl = callbackResp.headers.location as string;
  a.is(
    defaultRedirectUrl,
    new URL("/oauth/authorized", config.pathToExposeDomain).href,
    "default redirect url is not matched"
  );
});

test("should issue twitter account credential with custom property", async () => {
  const custom = { test: { hello: "world" } };
  const {
    address: ethAddress,
    didPkhPrefix,
    didPkh: subjectDID
  } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { sessionId, issueChallenge } = await preIssue({
    publicId: ethAddress,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: didPkhPrefix
    }
  });
  a.is(
    issueResp.statusCode, 200,
    `issue response fail. error: ${issueResp.body}`
  );
  const vc = JSON.parse(issueResp.body) as TwitterAccountVC;
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const { custom: vcCustom } = vc.credentialSubject;
  a.ok(vcCustom, "custom property is not present");
  a.ok(vcCustom.test, "custom.test property is not present");
  a.is(
    vcCustom.test.hello, "world",
    "custom hello property is not matched"
  );
});

test("should not find Twitter code", async () => {
  const { address: ethAddress, didPkhPrefix: ethDidPkhPrefix } =
    ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  await fastify.ready();
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("TwitterAccount"),
    payload: {
      publicId: ethAddress,
      redirectUrl: redirectUrl
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge response fail. error: ${challengeResp.body}`
  );

  const { issueChallenge, sessionId } =
    JSON.parse(challengeResp.body) as TwitterAccountChallenge;
  const signature = await ethereumSupport.sign(issueChallenge);
  const { statusCode, body } = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: ethDidPkhPrefix,
    }
  });
  a.is(
    statusCode, 400,
    "error response status code is not 400"
  );
  const error = JSON.parse(body);
  a.is(error.message, "Twitter processing your authorization. Wait!");
});

test("issue twitter account credential with expiration date", async () => {
  const {
    address: ethAddress,
    didPkh: subjectDID,
    didPkhPrefix: signType
  } = ethereumSupport.info.ethereum;
  const expirationDate = new Date();
  const fastify = app.context.resolve("httpServer").fastify;
  const { sessionId, issueChallenge } = await preIssue({
    publicId: ethAddress,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    payload: {
      signature: signature,
      sessionId: sessionId,
      signType: signType,
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body) as TwitterAccountVC;
  a.is(
    credential.expirationDate, expirationDate.toISOString(),
    "credential expiration date is not matched"
  );
});

test.run();
