import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon, { stub } from "sinon";
import {
  canIssueEP,
  challengeEP,
  issueEP,
  oauthCallbackEP
} from "../../../src/util/vc-route-util.js";
import * as url from "url";
import { isValidVC } from "../../../src/util/vc-utils.js";
import { VCType } from "../../../src/base/model/const/vc-type.js";
import { configDotEnv } from "../../../src/util/dotenv.js";
import type { CanIssueRes } from "../../../src/base/credentials.js";
import { ethereumSupport } from "../../support/ethereum.js";
import { LightMyRequestResponse } from "fastify";
import { solanaSupport } from "../../support/solana.js";
import { bitcoinSupport } from "../../support/bitcoin.js";
import type {
  GitHubAccOwnershipPayload,
  GitHubAccOwnershipVC
} from "../../../src/mates/github/issuers/github-account/index.js";
import { AnyObject } from "../../../src/util/model.util.js";

const test = suite("Integration: Issue GitHub account ownership vc");

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

async function preIssue(
  custom?: any
): Promise<{ sessionId: string; issueChallenge: string }> {
  const { fastify } = app.context.resolve("httpServer");

  const payloadResp = await fastify.inject({
    method: "POST",
    path: challengeEP(VCType.GitHubAccount),
    payload: {
      redirectUrl: redirectUrl,
      custom: custom
    }
  });
  a.is(payloadResp.statusCode, 200, "payload status code is not 200");

  const { sessionId, authUrl, issueChallenge } = JSON.parse(
    payloadResp.body
  ) as GitHubAccOwnershipPayload;
  a.ok(authUrl, "payload not contains oauth url");
  a.ok(sessionId, "payload not contains sessionId");
  a.ok(issueChallenge, "payload not contains issueChallenge");

  const { query } = url.parse(authUrl, true);
  const state = query.state as string;

  a.type(state, "string");

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP(VCType.GitHubAccount),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueBeforeResp.statusCode,
    200,
    "can issue before callback resp status is not 200"
  );

  const { canIssue: canIssueBefore } = JSON.parse(
    canIssueBeforeResp.body
  ) as CanIssueRes;
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
    callbackResp.statusCode,
    302,
    "callback response status code is not 302"
  );
  const redirectTo = callbackResp.headers.location as string;
  a.is(redirectTo, redirectUrl, "redirect url is not matched");

  const canIssueAfterResp = await fastify.inject({
    method: "GET",
    url: canIssueEP(VCType.GitHubAccount),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueAfterResp.statusCode,
    200,
    "can issue after callback resp status code is not 200"
  );
  const { canIssue: canIssueAfter } = JSON.parse(
    canIssueAfterResp.body
  ) as CanIssueRes;
  a.is(canIssueAfter, true, "can issue after callback is not true");

  return {
    sessionId: sessionId,
    issueChallenge: issueChallenge
  };
}

async function checkVCResponse(
  vcResponse: LightMyRequestResponse,
  didPkh: string
) {
  const issuerId = app.context.resolve("didService").id;
  a.is(vcResponse.statusCode, 200, "vc response status code is not 200");
  const vc = JSON.parse(vcResponse.body) as GitHubAccOwnershipVC;
  const { id, github } = vc.credentialSubject;
  a.is(vc.issuer.id, issuerId, "issuer id is not matched");
  a.is(vc.type.includes(VCType.GitHubAccount), true);
  a.is(id, didPkh, "vc credential subject id not matched");
  a.is(github.id, 1337, "github user id not matched");
  a.is(github.username, username, "github username not matched");
  a.is(github.userPage, "test", "github user page not matched");
  a.is(await isValidVC(vc), true, "vc is not valid");
}

function assertSessionDeleted(sessionId: string) {
  const { sessionCache } = app.context.resolve("gitHubAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted after issue");
}

test("should issue GitHub ownership credential with eth did-pkh", async () => {
  const {
    address: ethAddress,
    didPkh: ethDidPkh,
    didPkhPrefix: ethDidPkhPrefix
  } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;

  const { issueChallenge, sessionId } = await preIssue();
  const signature = await ethereumSupport.sign(issueChallenge);

  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.GitHubAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: ethAddress,
      signAlg: ethDidPkhPrefix
    }
  });
  assertSessionDeleted(sessionId);
  await checkVCResponse(vcResp, ethDidPkh);
});

test("should issue GitHub ownership credential with solana did-pkh", async () => {
  const {
    didPkhPrefix: solanaDidPkhPrefix,
    didPkh: solanaDidPkh,
    address: solanaAddress
  } = solanaSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue();
  const signature = await solanaSupport.sign(issueChallenge);

  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.GitHubAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: solanaAddress,
      signAlg: solanaDidPkhPrefix
    }
  });
  assertSessionDeleted(sessionId);
  await checkVCResponse(vcResp, solanaDidPkh);
});

test("should issue GitHub ownership credential with bitcoin did-pkh", async () => {
  const {
    didPkhPrefix: bitcoinDidPkhPrefix,
    didPkh: bitcoinDidPkh,
    address: bitcoinAddress
  } = bitcoinSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue();
  const signature = await bitcoinSupport.sing(issueChallenge);

  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.GitHubAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: bitcoinAddress,
      signAlg: bitcoinDidPkhPrefix
    }
  });
  assertSessionDeleted(sessionId);
  await checkVCResponse(vcResp, bitcoinDidPkh);
});

test("should redirect to default page after authorization", async () => {
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");

  const payloadResp = await fastify.inject({
    method: "POST",
    path: challengeEP(VCType.GitHubAccount)
  });
  a.is(payloadResp.statusCode, 200, "payload resp status code is not 200");
  const { authUrl } = JSON.parse(payloadResp.body) as GitHubAccOwnershipPayload;
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
    callbackResp.statusCode,
    302,
    "callback response status code is not 302"
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
  const { sessionId, issueChallenge } = await preIssue(custom);
  const signature = await ethereumSupport.sign(issueChallenge);
  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.GitHubAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: address,
      signAlg: didPkhPrefix
    }
  });
  a.is(vcResp.statusCode, 200, "vc resp status code is not 200");
  const vc = JSON.parse(vcResp.body) as GitHubAccOwnershipVC;
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
  const { address: ethAddress } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;

  const payloadResp = await fastify.inject({
    method: "POST",
    url: challengeEP(VCType.GitHubAccount),
    payload: {
      redirectUrl: redirectUrl
    }
  });

  a.is(
    payloadResp.statusCode,
    200,
    "payload response status code is not 200"
  );

  const { sessionId, issueChallenge } = JSON.parse(
    payloadResp.body
  ) as GitHubAccOwnershipPayload;

  const signature = await ethereumSupport.sign(issueChallenge);

  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.GitHubAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: ethAddress
    }
  });

  a.is(errResp.statusCode, 400, "error response status code is not 400");
  const { message } = JSON.parse(errResp.body);
  a.is(
    message,
    "GitHub processing your authorization. Wait!",
    "error message not matched"
  );
});

test.run();
