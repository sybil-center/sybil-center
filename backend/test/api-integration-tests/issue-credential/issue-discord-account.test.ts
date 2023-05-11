import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon, { stub } from "sinon";
import { canIssueEP, challengeEP, issueEP, } from "@sybil-center/sdk/util";
import * as url from "url";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { LightMyRequestResponse } from "fastify";
import { ethereumSupport } from "../../test-support/chain/ethereum.js";
import { solanaSupport } from "../../test-support/chain/solana.js";
import { CanIssueResp, DiscordAccountChallenge, DiscordAccountProps, DiscordAccountVC } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../src/util/model.util.js";
import { oauthCallbackEP } from "../../../src/util/route.util.js";
import { api } from "../../test-support/api/index.js";
import { bitcoinSupport } from "../../test-support/chain/bitcoin.js";
import { delay } from "../../../src/util/delay.util.js";

const test = suite("Integration: issue Discord account credential");

let app: App;
let apiKey: string;

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
  app = await App.init();
  const keys = await api.apiKeys(app);
  apiKey = keys.apiKey;

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
  subjectId: string;
  props?: DiscordAccountProps[]
}

const preIssue = async (
  args: PreIssueEntry
): Promise<{
  sessionId: string;
  issueMessage: string
}> => {
  const fastify = app.context.resolve("httpServer").fastify;

  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      redirectUrl: redirectUrl,
      custom: args.custom,
      expirationDate: args.expirationDate,
      subjectId: args.subjectId,
      props: args.props
    }
  });
  a.is(challengeResp.statusCode, 200,
    "payload response status code is not 200");
  const { sessionId, issueMessage, authUrl } =
    JSON.parse(challengeResp.body) as DiscordAccountChallenge;

  const { query } = url.parse(authUrl, true);
  const state = query.state as string;

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: canIssueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    query: {
      sessionId: sessionId
    }
  });
  a.is(
    canIssueAfterResp.statusCode, 200,
    "can issue after callback resp status is not 200"
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueAfterResp.body) as CanIssueResp;
  a.is(canIssueAfter, true, "can issue after callback is not true");

  return {
    sessionId: sessionId,
    issueMessage: issueMessage
  };
};

const assertIssueResp = async (
  issueResp: LightMyRequestResponse,
  subjectDID: string
) => {
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
};


const assertSessionDeleted = (sessionId: string) => {
  //@ts-ignore
  const { sessionCache } = app.context.resolve("discordAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted");
};

test("should issue discord ownership credential with ethereum did-pkh", async () => {
  const ethDidPkh = ethereumSupport.info.ethereum.didPkh;
  const fastify = app.context.resolve("httpServer").fastify;

  const { issueMessage, sessionId } = await preIssue({ subjectId: ethDidPkh });
  const signature = await ethereumSupport.sign(issueMessage);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  await assertIssueResp(vcResponse, ethDidPkh);
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(vcResponse.body);
  await api.verifyCredential(credential, app);
});

test("should issue discord ownership credential with solana did-pkh", async () => {
  const {
    didPkh: solanaDidPkh,
  } = solanaSupport.info;
  const { fastify } = app.context.resolve("httpServer");

  const { sessionId, issueMessage } = await preIssue({ subjectId: solanaDidPkh });
  const signature = await solanaSupport.sign(issueMessage);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  await assertIssueResp(vcResponse, solanaDidPkh);
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(vcResponse.body);
  await api.verifyCredential(credential, app);
});

test("should issue discord ownership credential with bitcoin did-pkh", async () => {
  const { didPkh: bitcoinDidPkh, } = bitcoinSupport.info;
  const { fastify } = app.context.resolve("httpServer");

  const { sessionId, issueMessage } = await preIssue({ subjectId: bitcoinDidPkh });
  const signature = await bitcoinSupport.sing(issueMessage);

  const vcResponse = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature
    }
  });
  await assertIssueResp(vcResponse, bitcoinDidPkh);
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(vcResponse.body);
  await api.verifyCredential(credential, app);
});

test("should redirect to default page after authorization", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: didPkh
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
  const { didPkh } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { sessionId, issueMessage } = await preIssue({
    subjectId: didPkh,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
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
  //@ts-ignore
  await api.verifyCredential(vc, app);
});

test("should not find Discord code", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  await fastify.ready();
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      redirectUrl: redirectUrl,
      subjectId: didPkh
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    "challenge response status code is not 200"
  );

  const { sessionId, issueMessage } = JSON.parse(
    challengeResp.body
  ) as DiscordAccountChallenge;
  const signature = await ethereumSupport.sign(issueMessage);

  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(errResp.statusCode, 400, "error response status code is not 400");
  const { message } = JSON.parse(errResp.body);
  a.is(message, "Discord processing your authorization. Wait!",
    "error message not matched");
  await fastify.ready();
});

test("issue discord account credential with expiration date", async () => {
  const { didPkh: subjectDID } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const expirationDate = new Date();
  const { sessionId, issueMessage } = await preIssue({
    subjectId: subjectDID,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueMessage);

  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  await assertIssueResp(issueResp, subjectDID);
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  a.ok(credential.expirationDate, "credential expiration date is not present");
  a.is(
    credential.expirationDate,
    expirationDate.toISOString(),
    "credential expiration date is not matched");

  await delay(20);
  await api.verifyCredential(credential, app, false);
});

test("not valid date-time format for expiration date", async () => {
  const { fastify } = app.context.resolve("httpServer");
  const ethDidPkh = ethereumSupport.info.ethereum.didPkh;
  const errResp = await fastify.inject({
    method: "POST",
    url: challengeEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      redirectUrl: redirectUrl,
      expirationDate: "not a date",
      subjectId: ethDidPkh
    }
  });
  a.is(errResp.statusCode, 400,
    `invalid expiration date is ok. error: ${errResp.body}`);
});

test("should issue eth account credential without props", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { didPkh } = ethereumSupport.info.ethereum;
  const {
    sessionId,
    issueMessage
  } = await preIssue({ subjectId: didPkh, props: [] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp fail. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as DiscordAccountVC;
  a.ok(credential.credentialSubject.discord, `subject discord field is empty`);
  a.not.ok(credential.credentialSubject.discord.id);
  a.not.ok(credential.credentialSubject.discord.username);
  a.not.ok(credential.credentialSubject.discord.discriminator);
});

test("should issue eth account credential with only one prop", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { didPkh } = ethereumSupport.info.ethereum;
  const {
    sessionId,
    issueMessage
  } = await preIssue({ subjectId: didPkh, props: ["username"] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("DiscordAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp fail. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as DiscordAccountVC;
  a.ok(credential.credentialSubject.discord, `subject discord field is empty`);
  a.is(
    credential.credentialSubject.discord.username, discordUser.username,
    `subject discord user nate is not matched`
  );
  a.not.ok(credential.credentialSubject.discord.id, `discord field contains id prop`);
  a.not.ok(credential.credentialSubject.discord.discriminator, `discord field contains discriminator`);
});

test.run();
