import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon, { stub } from "sinon";
import { oauthCallbackEP } from "../../../src/util/route.util.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";
import * as url from "url";
import { isValidVC } from "../../../src/util/credential.utils.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { ethereumSupport } from "../../test-support/ethereum.js";
import { LightMyRequestResponse } from "fastify";
import { solanaSupport } from "../../test-support/solana.js";
import { bitcoinSupport } from "../../test-support/bitcoin.js";
import { CanIssueResp, GitHubAccountChallenge, GitHubAccountVC } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../src/util/model.util.js";

const test = suite("Integration: issue GitHub account credential");

let app: App;

const redirectUrl = "https://example.com/";
const code = "code";
const accessToken = "access_token";
const username = `test-${Math.floor(Math.random() * 1000)}`;
const gitHubUserUrl = `https://api.github.com/${username}`;

test.before(async () => {
  const configUrl = new URL("../../test.env", import.meta.url);
  configDotEnv({ path: configUrl, override: true });
  app = new App();
  await app.init();

  const issuer = app.context.resolve("gitHubAccountIssuer");
  const gitHubService = issuer.gitHubService;

  stub(gitHubService, "getAccessToken").resolves(accessToken);
  stub(gitHubService, "getUser").resolves({
    html_url: "test",
    login: username,
    id: 1337,
    url: gitHubUserUrl,
    name: "test"
  });
});

test.after(async () => {
  await app.close();
  sinon.restore();
});

type PreIssueArgs = {
  publicId: string,
  custom?: AnyObj,
  expirationDate?: Date,
}

const preIssue = async (
  args: PreIssueArgs
): Promise<{ sessionId: string; issueChallenge: string }> => {
  const { fastify } = app.context.resolve("httpServer");
  const challengeResp = await fastify.inject({
    method: "POST",
    path: challengeEP("GitHubAccount"),
    payload: {
      publicId: args.publicId,
      redirectUrl: redirectUrl,
      custom: args.custom,
      expirationDate: args.expirationDate
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `payload status code is not 200. error: ${challengeResp.body}`
  );
  const { sessionId, authUrl, issueChallenge } =
    JSON.parse(challengeResp.body) as GitHubAccountChallenge;
  a.ok(authUrl, "payload not contains oauth url");
  a.ok(sessionId, "payload not contains sessionId");
  a.ok(issueChallenge, "payload not contains issueChallenge");

  const { query } = url.parse(authUrl, true);
  const state = query.state as string;
  a.type(state, "string");

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("GitHubAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueBeforeResp.statusCode, 200,
    `can issue before callback resp status is not 200. error: ${canIssueBeforeResp.body}`
  );

  const { canIssue: canIssueBefore } =
    JSON.parse(canIssueBeforeResp.body) as CanIssueResp;
  a.is(canIssueBefore, false, "can issue before callback is not false");

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
    `callback response status code is not 302. error: ${callbackResp.body}`
  );
  const redirectTo = callbackResp.headers.location as string;
  a.is(redirectTo, redirectUrl, "redirect url is not matched");

  const canIssueAfterResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("GitHubAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueAfterResp.statusCode, 200,
    `can issue after callback resp status code is not 200. error: ${canIssueAfterResp.body}`
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueAfterResp.body) as CanIssueResp;
  a.is(canIssueAfter, true, "can issue after callback is not true");

  return {
    sessionId: sessionId,
    issueChallenge: issueChallenge
  };
};

type AssertIssueRespArgs = {
  issueResp: LightMyRequestResponse,
  subjectDID: string;
}

const assertIssueResp = async (args: AssertIssueRespArgs) => {
  const { issueResp, subjectDID } = args;
  const issuerDID = app.context.resolve("didService").id;
  a.is(issueResp.statusCode, 200, "vc response status code is not 200");
  const vc = JSON.parse(issueResp.body) as GitHubAccountVC;
  const { id, github } = vc.credentialSubject;
  a.is(vc.issuer.id, issuerDID, "issuer id is not matched");
  a.is(
    vc.type[0], "VerifiableCredential",
    "first credential type is not matched"
  );
  a.is(
    vc.type[1], "GitHubAccount",
    "second credential type is not matched"
  );
  a.is(id, subjectDID, "credential subject id not matched");
  a.is(github.id, 1337, "github user id not matched");
  a.is(github.username, username, "github username not matched");
  a.is(github.userPage, "test", "github user page not matched");
  a.is(await isValidVC(vc), true, "vc is not valid");
};

const assertSessionDeleted = (sessionId: string) => {
  const { sessionCache } = app.context.resolve("gitHubAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted after issue");
};

test("should issue GitHub ownership credential with eth did-pkh", async () => {
  const {
    address: ethAddress,
    didPkh: subjectDID,
    didPkhPrefix: ethDidPkhPrefix
  } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;

  const { issueChallenge, sessionId } = await preIssue({publicId: ethAddress});
  const signature = await ethereumSupport.sign(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: ethDidPkhPrefix
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
});

test("should issue GitHub ownership credential with solana did-pkh", async () => {
  const {
    didPkhPrefix: solanaDidPkhPrefix,
    didPkh: subjectDID,
    address: solanaAddress
  } = solanaSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue({publicId: solanaAddress});
  const signature = await solanaSupport.sign(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: solanaDidPkhPrefix
    }
  });
  await assertIssueResp({ subjectDID, issueResp });
  assertSessionDeleted(sessionId);
});

test("should issue GitHub ownership credential with bitcoin did-pkh", async () => {
  const {
    didPkhPrefix: bitcoinDidPkhPrefix,
    didPkh: subjectDID,
    address: bitcoinAddress
  } = bitcoinSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue({publicId: bitcoinAddress});
  const signature = await bitcoinSupport.sing(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: bitcoinDidPkhPrefix
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
});

test("should redirect to default page after authorization", async () => {
  const { address: publicId } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");

  const challengeResp = await fastify.inject({
    method: "POST",
    path: challengeEP("GitHubAccount"),
    payload: {
      publicId: publicId
    }
  });
  a.is(challengeResp.statusCode, 200, `payload resp status code is not 200`);
  const { authUrl } = JSON.parse(challengeResp.body) as GitHubAccountChallenge;
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
    `callback response status code is not 302. error: ${callbackResp.body}`
  );
  const defaultRedirectUrl = callbackResp.headers.location as string;
  a.is(
    defaultRedirectUrl,
    new URL("/oauth/authorized", config.pathToExposeDomain).href,
    "default redirect url is not matched"
  );
});

test("should issue credential with custom property", async () => {
  const custom = { test: { hello: "world" } };
  const { address, didPkhPrefix } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { sessionId, issueChallenge } = await preIssue({
    publicId: address,
    custom:custom
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: didPkhPrefix
    }
  });
  a.is(vcResp.statusCode, 200, "vc resp status code is not 200");
  const vc = JSON.parse(vcResp.body) as GitHubAccountVC;
  const { custom: vcCustom } = vc.credentialSubject;
  a.is(await isValidVC(vc), true, "vc is not valid");
  a.ok(vcCustom, "custom property is not present");
  a.ok(vcCustom.test, "custom.test property is not present");
  a.is(
    vcCustom.test.hello,
    "world",
    "hello custom property is not matched"
  );
  assertSessionDeleted(sessionId);
});

test("should not find GitHub code", async () => {
  const { address: ethAddress, didPkhPrefix: signType } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("GitHubAccount"),
    payload: {
      publicId: ethAddress,
      redirectUrl: redirectUrl
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `payload response status code is not 200. error: ${challengeResp.body}`
  );
  const {
    sessionId,
    issueChallenge
  } = JSON.parse(challengeResp.body) as GitHubAccountChallenge;
  const signature = await ethereumSupport.sign(issueChallenge);
  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: signType
    }
  });
  a.is(
    errResp.statusCode, 400,
    "error response status code is not 400"
  );
  const { message } = JSON.parse(errResp.body);
  a.is(
    message, "GitHub processing your authorization. Wait!",
    "error message not matched"
  );
});

test("issue github account credential with expiration date", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const {
    didPkh: subjectDID,
    didPkhPrefix: signType,
    address: ethAddress
  } = ethereumSupport.info.celo;
  const expirationDate = new Date();
  const { sessionId, issueChallenge } = await preIssue({
    publicId: ethAddress,
    expirationDate:expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("GitHubAccount"),
    payload: {
      sessionId: sessionId,
      signType: signType,
      signature: signature,
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body) as GitHubAccountVC;
  a.is(
    credential.expirationDate, expirationDate.toISOString(),
    "credential expiration date is not matched"
  );
});

test.run();
