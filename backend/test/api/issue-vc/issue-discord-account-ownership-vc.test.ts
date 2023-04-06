import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon, { stub } from "sinon";
import { canIssueEP, challengeEP, issueEP, } from "@sybil-center/sdk/util";
import * as url from "url";
import { isValidVC } from "../../../src/util/credential.utils.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { LightMyRequestResponse } from "fastify";
import { ethereumSupport } from "../../support/ethereum.js";
import { bitcoinSupport } from "../../support/bitcoin.js";
import { solanaSupport } from "../../support/solana.js";
import { CanIssueResp, DiscordAccountChallenge, DiscordAccountVC } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../src/util/model.util.js";
import { oauthCallbackEP } from "../../../src/util/route.util.js";

const test = suite("Integration: Issue Discord account ownership vc");

let app: App;

const redirectUrl = "https://example.com/";
const code = "code";
const accessToken = "access_token";

const discordUser = {
  discriminator: "8822",
  id: "123456789",
  username: "test user name"
};

test.before(async () => {
  const config = new URL("../../test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = new App();
  await app.init();

  const discordAccountIssuer = app.context.resolve(
    "discordAccountIssuer"
  );
  const discordService = discordAccountIssuer.discordService;
  stub(discordService, "getAccessToken").resolves(accessToken);
  stub(discordService, "getUser").resolves(discordUser);
});

test.after(async () => {
  await app.close();
  sinon.restore();
});

type PreIssueEntry = {
  custom?: AnyObj;
  expirationDate?: Date;
  publicId: string;
}

async function preIssue(args: PreIssueEntry): Promise<{ sessionId: string; issueChallenge: string }> {
  const fastify = app.context.resolve("httpServer").fastify;

  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    payload: {
      redirectUrl: redirectUrl,
      custom: args.custom,
      expirationDate: args.expirationDate,
      publicId: args.publicId
    }
  });
  a.is(challengeResp.statusCode, 200,
    "payload response status code is not 200");
  const { sessionId, issueChallenge, authUrl } =
    JSON.parse(challengeResp.body) as DiscordAccountChallenge;

  const { query } = url.parse(authUrl, true);
  const state = query.state as string;

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("DiscordAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueBeforeResp.statusCode,
    200,
    "can issue before callback resp status is not 200"
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
    callbackResp.statusCode,
    302,
    "callback response status code is not 302"
  );
  const redirectedTo = callbackResp.headers.location as string;
  a.is(redirectedTo, redirectUrl, "redirect url is not matched");

  const canIssueAfterResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("DiscordAccount"),
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueAfterResp.statusCode,
    200,
    "can issue after callback resp status is not 200"
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueAfterResp.body) as CanIssueResp;
  a.is(canIssueAfter, true, "can issue after callback is not true");

  return {
    sessionId: sessionId,
    issueChallenge: issueChallenge
  };
}

async function assertIssueResp(
  issueResp: LightMyRequestResponse,
  subjectDID: string
) {
  const issuerId = app.context.resolve("didService").id;
  a.is(issueResp.statusCode, 200,
    `issue resp status code is not 200. error: ${issueResp.body}`);

  const vc = JSON.parse(issueResp.body) as DiscordAccountVC;
  const {
    discriminator,
    id: discordId,
    username
  } = vc.credentialSubject.discord;

  a.is(vc.issuer.id, issuerId, "issuer id is not matched");
  a.is(vc.type.includes("DiscordAccount"), true);
  a.is(
    vc.credentialSubject.id, subjectDID,
    "vc credential subject id is not matched"
  );
  a.is(
    discriminator,
    discordUser.discriminator,
    "discord user discriminator is not matched"
  );
  a.is(discordId, discordUser.id, "discord user id is not matched");
  a.is(username, discordUser.username, "discord username is not matched");
  a.is(await isValidVC(vc), true, "vc is not valid");
}

function assertSessionDeleted(sessionId: string) {
  //@ts-ignore
  const { sessionCache } = app.context.resolve("discordAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted");
}

test("should issue discord ownership credential with ethereum did-pkh", async () => {
  const {
    address: ethAddress,
    didPkhPrefix: ethDidPkhPrefix,
    didPkh: ethDidPkh
  } = ethereumSupport.info.ethereum;

  const fastify = app.context.resolve("httpServer").fastify;

  const { issueChallenge, sessionId } = await preIssue({ publicId: ethAddress });
  const signature = await ethereumSupport.sign(issueChallenge);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: ethDidPkhPrefix,
    }
  });
  await assertIssueResp(vcResponse, ethDidPkh);
  assertSessionDeleted(sessionId);
});

test("should issue discord ownership credential with solana did-pkh", async () => {
  const {
    didPkhPrefix: solanaDidPkhPrefix,
    didPkh: solanaDidPkh,
    address: solanaAddress
  } = solanaSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { sessionId, issueChallenge } = await preIssue({ publicId: solanaAddress });
  const signature = await solanaSupport.sign(issueChallenge);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: solanaDidPkhPrefix,
    }
  });
  await assertIssueResp(vcResponse, solanaDidPkh);
  assertSessionDeleted(sessionId);
});

test("should issue discord ownership credential with bitcoin did-pkh", async () => {
  const {
    address: bitcoinAddress,
    didPkh: bitcoinDidPkh,
    didPkhPrefix: bitcoinDidPkhPrefix
  } = bitcoinSupport.info;

  const { fastify } = app.context.resolve("httpServer");

  const { sessionId, issueChallenge } = await preIssue({ publicId: bitcoinAddress });
  const signature = await bitcoinSupport.sing(issueChallenge);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: bitcoinDidPkhPrefix,
    }
  });
  await assertIssueResp(vcResponse, bitcoinDidPkh);
  assertSessionDeleted(sessionId);
});

test("should redirect to default page after authorization", async () => {
  const { address } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    payload: {
      publicId: address
    }
  });
  a.is(challengeResp.statusCode, 200, "payload resp status code is not 200");
  const { authUrl } = JSON.parse(
    challengeResp.body
  ) as DiscordAccountChallenge;
  const { query } = url.parse(authUrl, true);
  const state = query.state as string;

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
  a.ok(
    defaultRedirectUrl,
    "default redirect url after authorization is not present"
  );
  a.is(
    defaultRedirectUrl,
    new URL("/oauth/authorized", config.pathToExposeDomain).href,
    "default redirect url after authorization is not matched"
  );
});

test("should issue vc with custom properties", async () => {
  const custom = { hello: { test: "test", world: "world" } };
  const { address, didPkhPrefix, didPkh } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { sessionId, issueChallenge } = await preIssue({
    publicId: address,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: didPkhPrefix,
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp status code is not 200. error: ${issueResp.body}`);
  await assertIssueResp(issueResp, didPkh);
  const vc = JSON.parse(issueResp.body) as DiscordAccountVC;
  const vcCustom = vc.credentialSubject.custom;
  a.ok(vcCustom, "custom property is not present");
  a.ok(vcCustom.hello, "custom hello is not present");
  a.is(vcCustom.hello.test, "test", "custom property is not matched");
  a.is(vcCustom.hello.world, "world", "custom property is not matched");
  assertSessionDeleted(sessionId);
});

test("should not find Discord code", async () => {
  const { address } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  await fastify.ready();
  const payloadResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    payload: {
      redirectUrl: redirectUrl,
      publicId: address
    }
  });
  a.is(
    payloadResp.statusCode, 200,
    "challenge response status code is not 200"
  );

  const { sessionId, issueChallenge } = JSON.parse(
    payloadResp.body
  ) as DiscordAccountChallenge;
  const signature = await ethereumSupport.sign(issueChallenge);

  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: "test"
    }
  });
  a.is(errResp.statusCode, 400, "error response status code is not 400");
  const { message } = JSON.parse(errResp.body);
  a.is(message, "Discord processing your authorization. Wait!",
    "error message not matched");
  await fastify.ready();
});

test("issue discord account credential with expiration date", async () => {
  const { didPkhPrefix, address, didPkh: subjectDID } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const expirationDate = new Date();
  const { sessionId, issueChallenge } = await preIssue({
    publicId: address,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: didPkhPrefix,
    }
  });
  await assertIssueResp(issueResp, subjectDID);
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body) as DiscordAccountVC;
  a.ok(credential.expirationDate, "credential expiration date is not present");
  a.is(
    credential.expirationDate,
    expirationDate.toISOString(),
    "credential expiration date is not matched");
});

test("not valid date-time format for expiration date", async () => {
  const { fastify } = app.context.resolve("httpServer");
  const errResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    payload: {
      redirectUrl: redirectUrl,
      expirationDate: "not a date"
    }
  });
  a.is(errResp.statusCode, 400,
    `invalid expiration date is ok. error: ${errResp.body}`);
});

test.run();
