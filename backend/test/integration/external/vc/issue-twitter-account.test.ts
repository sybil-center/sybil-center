import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../../src/app/app.js";
import sinon, { stub } from "sinon";
import { oauthCallbackEP } from "../../../../src/util/route.util.js";
import { canIssueEP, challengeEP, issueEP } from "@sybil-center/sdk/util";
import * as url from "url";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { ethereumSupport } from "../../../support/chain/ethereum.js";
import { LightMyRequestResponse } from "fastify";
import { solanaSupport } from "../../../support/chain/solana.js";
import { bitcoinSupport } from "../../../support/chain/bitcoin.js";
import { CanIssueResp, TwitterAccountChallenge, TwitterAccountProps, TwitterAccountVC } from "@sybil-center/sdk/types";
import { appSup } from "../../../support/app/index.js";
import { delay } from "../../../../src/util/delay.util.js";
import { support } from "../../../support/index.js";

const test = suite("INTEGRATION API: issue Twitter account credential test");

let app: App;
let apiKey: string;

const redirectUrl = "https://example.com/";
const code = "code";
const accessToken = "access_token";
const twitterUsername = `test-${Math.floor(Math.random() * 1000)}`;

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });

  app = await App.init();
  const keys = await appSup.apiKeys(app);
  apiKey = keys.apiKey;

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
  subjectId: string,
  custom?: Record<string, any>;
  expirationDate?: Date;
  props?: TwitterAccountProps[]
}

const preIssue = async (
  args: PreIssueArgs
): Promise<{ issueMessage: string; sessionId: string }> => {
  const { fastify } = app.context.resolve("httpServer");
  await fastify.ready();
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: args.subjectId,
      redirectUrl: redirectUrl,
      custom: args.custom,
      expirationDate: args.expirationDate,
      props: args.props
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge status code is not 200. error: ${challengeResp.body}`
  );
  const {
    authUrl,
    issueMessage,
    sessionId
  } = JSON.parse(challengeResp.body) as TwitterAccountChallenge;
  const { query } = url.parse(authUrl, true);
  const state = query.state as string;
  a.type(state, "string");

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
    issueMessage: issueMessage,
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
};

const assertSessionDeleted = (sessionId: string) => {
  const { sessionCache } = app.context.resolve("twitterAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session cache is not deleted after issue");
};

test("should issue Twitter ownership credential with eth did-pkh", async () => {
  const { didPkh: subjectDID, } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;

  const { issueMessage, sessionId } = await preIssue({ subjectId: subjectDID });
  const signature = await ethereumSupport.sign(issueMessage);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("should issue Twitter ownership credential with bitcoin did-pkh", async () => {
  const { didPkh: subjectDID, } = bitcoinSupport.info;

  const { fastify } = app.context.resolve("httpServer");
  const { issueMessage, sessionId } = await preIssue({ subjectId: subjectDID });
  const signature = await bitcoinSupport.sing(issueMessage);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("should issue Twitter ownership credential with solana did-pkh", async () => {
  const { didPkh: subjectDID } = solanaSupport.info;

  const { fastify } = app.context.resolve("httpServer");
  const { issueMessage, sessionId } = await preIssue({ subjectId: subjectDID });
  const signature = await solanaSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("should redirect to default page after authorization", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const challengeResp = await fastify.inject({
    method: "POST",
    path: challengeEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: didPkh
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
  const { didPkh: subjectDID } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { sessionId, issueMessage } = await preIssue({
    subjectId: subjectDID,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(
    issueResp.statusCode, 200,
    `issue response fail. error: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body);
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const { custom: vcCustom } = credential.credentialSubject;
  a.ok(vcCustom, "custom property is not present");
  a.ok(vcCustom.test, "custom.test property is not present");
  a.is(
    vcCustom.test.hello, "world",
    "custom hello property is not matched"
  );
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("should not find Twitter code", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  await fastify.ready();
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: didPkh,
      redirectUrl: redirectUrl
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge response fail. error: ${challengeResp.body}`
  );

  const { issueMessage, sessionId } =
    JSON.parse(challengeResp.body) as TwitterAccountChallenge;
  const signature = await ethereumSupport.sign(issueMessage);
  const { statusCode, body } = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
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
  const { didPkh: subjectDID, } = ethereumSupport.info.ethereum;
  const expirationDate = new Date();
  const fastify = app.context.resolve("httpServer").fastify;
  const { sessionId, issueMessage } = await preIssue({
    subjectId: subjectDID,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      signature: signature,
      sessionId: sessionId
    }
  });
  await assertIssueResp({ issueResp, subjectDID });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  a.is(
    credential.expirationDate, expirationDate.toISOString(),
    "credential expiration date is not matched"
  );
  await delay(20);
  await appSup.verifyCredential({
    credential: credential,
    app: app,
    shouldVerified: false
  });
});

test("should issue twitter account credential without props", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { didPkh } = ethereumSupport.info.ethereum;
  const { sessionId, issueMessage } = await preIssue({ subjectId: didPkh, props: [] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp fail. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as TwitterAccountVC;
  const twitter = credential.credentialSubject.twitter;
  a.ok(twitter, `subject twitter field is undefined`);
  a.not.ok(twitter.id, `subject twitter field must be empty`);
  a.not.ok(twitter.username, `subject twitter field must be empty`);
});

test("should issue twitter account credential with only one prop", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { didPkh } = ethereumSupport.info.ethereum;
  const { sessionId, issueMessage } = await preIssue({ subjectId: didPkh, props: ["username"] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("TwitterAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp fail. ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as TwitterAccountVC;
  const twitter = credential.credentialSubject.twitter;
  a.ok(twitter, `subject twitter field is undefined`);
  a.is(twitter.username, twitterUsername, `twitter user name is not matched`);
  a.not.ok(twitter.id, `twitter.id must be undefiend`);
});

// test.run();
