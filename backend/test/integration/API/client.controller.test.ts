import { suite } from "uvu";
import { App } from "../../../src/app/app.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import sinon from "sinon";
import { appSup } from "../../support/app/index.js";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import { EthAccountVC } from "@sybil-center/sdk";
import {
  selfFindClientEP,
  selfIsLoggedInClientEP,
  selfLoginClientEP,
  selfLogoutClientEP,
  selfUpdateClientEP
} from "../../../src/util/route.util.js";
import * as a from "uvu/assert";
import { AccountJWT } from "../../../src/base/service/jwt.service.js";
import { encode } from "../../../src/util/encoding.util.js";
import { ClientEntity } from "../../../src/base/storage/client.repo.js";

const test = suite("INTEGRATION API: client controller");

interface Cookie {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  [name: string]: unknown;
}

const toStrCookies = (cookies: Cookie[]): string => {
  return cookies
    .map((cookie) => ({ name: cookie.name, value: cookie.value }))
    .reduce((prev, current) => {
      const cookie = `${current.name}=${current.value}`;
      if (prev.length === 0) return cookie;
      return [prev, cookie].join("; ");
    }, "");
};

let app: App;

test.before(async () => {
  const config = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = await App.init();
});

test.before.each(async () => {
  const captchaService = app.context.resolve("captchaService");
  sinon.stub(captchaService, "isHuman").resolves({
    isHuman: true,
    score: 0.9,
    reasons: []
  });
  const accountId = ethereumSupport.info.ethereum.didPkh.split(":").slice(2).join("");
  const clientService = app.context.resolve("clientService");
  sinon.stub(clientService, "findOrCreate").resolves({
    accountId: accountId,
    customSchemas: [],
    restrictionURIs: []
  });

  sinon.stub(clientService, "get").resolves({
    accountId: accountId,
    customSchemas: [],
    restrictionURIs: []
  });
});

test.after.each(async () => {
  sinon.restore();
});

test.after(async () => {
  await app.close();
});


const issueCredential = async (): Promise<EthAccountVC> => {
  const { apiKeysCredentialTTL: ttlRange } = app.context.resolve("config");
  const subjectId = ethereumSupport.info.ethereum.didPkh;

  const expDate = new Date();
  expDate.setTime(expDate.getTime() + ttlRange - 100);

  return await appSup.issueEthAccountVC({
    app: app,
    subjectId: subjectId,
    signFn: ethereumSupport.sign,
    opt: {
      expirationDate: expDate
    }
  });
};

test("should login client", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const jwtService = app.context.resolve("jwtService");
  const config = app.context.resolve("config");
  const expAccountId = ethereumSupport.info.ethereum.didPkh.split(":").slice(2).join("");
  const credential = await issueCredential();
  const resp = await fastify.inject({
    method: "POST",
    url: selfLoginClientEP,
    payload: {
      credential: credential,
      captchaToken: "test"
    }
  });
  a.is(resp.statusCode, 200, "client login resp status code is not matched");
  const cookies = resp.cookies;
  const { status } = JSON.parse(resp.body) as { status: string };
  a.is(status, "ok", "login client body status not 'ok'");
  a.is(
    cookies
      .map((cookie) => cookie.name)
      .filter((name) => name === "sybil-client" || name === "sybil-account")
      .length,
    2,
    "cookies have to include 'sybil-client' & 'sybil-account' cookies");
  cookies.forEach((cookie) => {
    if (cookie.name === "sybil-client") {
      const { accountId } = jwtService.verifyToken<AccountJWT>(cookie.value);
      a.is(accountId, expAccountId, "account id from JWT cookie not matched");
      a.is(cookie.domain, config.frontendOrigin.href, "sybil-client cookie domain not matched");
      a.is(cookie.httpOnly, true, "sybil-client cookie HttpOnly has to be");
      a.is(cookie.sameSite, "Strict", "sybil-client cookie SameSite has to be 'Strict'");
    }
    if (cookie.name === "sybil-account") {
      const accountId = encode.from(cookie.value, "base64url").to("utf8");
      a.is(accountId, expAccountId, "account id from sybil-account cookie not matched");
      a.is(cookie.sameSite, "Strict", "sybil-account cookie SameSite has to be 'Strict'");
      a.is(cookie.domain, config.frontendOrigin.href, "sybil-account cookie domain not matched");
    }
  });
});

test("should check client login status", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const credential = await issueCredential();
  const loginResp = await fastify.inject({
    method: "POST",
    url: selfLoginClientEP,
    payload: {
      credential: credential,
      captchaToken: "test"
    }
  });
  a.is(loginResp.statusCode, 200, `Client login error: ${loginResp.body}`);
  const cookies = toStrCookies(loginResp.cookies);
  const isLoggedInResp = await fastify.inject({
    method: "GET",
    url: selfIsLoggedInClientEP,
    headers: {
      cookie: cookies
    }
  });
  a.is(
    isLoggedInResp.statusCode, 200,
    `Is logged in resp error: ${isLoggedInResp.body}`
  );
  const { isLoggedIn } = JSON.parse(isLoggedInResp.body) as { isLoggedIn: boolean };
  a.is(isLoggedIn, true, "is logged in result must be 'true'");

  const notLoggedInResp = await fastify.inject({ // check with no cookie
    method: "GET",
    url: selfIsLoggedInClientEP,
  });
  a.is(
    notLoggedInResp.statusCode, 200,
    `not logged in resp error: ${notLoggedInResp.body}`
  );
  const { isLoggedIn: notLoggedIn } =
    JSON.parse(notLoggedInResp.body) as { isLoggedIn: boolean };
  a.is(notLoggedIn, false, "is logged in result must be 'false'");
});

test("should logout client", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const credential = await issueCredential();

  const loginResp = await fastify.inject({
    method: "POST",
    url: selfLoginClientEP,
    payload: {
      credential: credential,
      captchaToken: "test"
    }
  });
  a.is(loginResp.statusCode, 200, "client login status code resp not 200");
  const cookies = toStrCookies(loginResp.cookies);
  const logoutResp = await fastify.inject({
    method: "GET",
    url: selfLogoutClientEP,
    headers: {
      cookie: cookies
    }
  });
  a.is(
    logoutResp.statusCode, 200,
    `client logout status code resp not 200. error: ${logoutResp.body}`
  );
  const cleanedCookies = logoutResp.cookies
    .filter(({ value, expires }) => (value === "") && (expires!.getTime() === 0));

  a.is(
    cleanedCookies.length, 2,
    "client logout action has to clean cookies"
  );
  const { status } = JSON.parse(logoutResp.body) as { status: "ok" };
  a.is(status, "ok", "logout resp body status has to be 'ok'");
});

test("should update client", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const clientRepo = app.context.resolve("clientRepo");
  const clientProps: Omit<ClientEntity, "accountId"> = {
    restrictionURIs: ["https://example.com"],
    customSchemas: [{ properties: { name: { type: "string" } } }]
  };
  sinon.stub(clientRepo, "update").resolves({
    accountId: ethereumSupport.info.ethereum.accountId,
    ...clientProps
  });
  const credential = await issueCredential();
  const loginResp = await fastify.inject({
    method: "POST",
    url: selfLoginClientEP,
    payload: {
      credential: credential,
      captchaToken: "test"
    }
  });
  a.is(loginResp.statusCode, 200, "client login resp status code is not matched");
  const cookies = toStrCookies(loginResp.cookies);
  const updateResp = await fastify.inject({
    method: "PATCH",
    url: selfUpdateClientEP,
    headers: {
      cookie: cookies
    },
    payload: {
      requirements: {
        credential: credential,
        captchaToken: "test",
      },
      client: { ...clientProps }
    }
  });
  a.is(
    updateResp.statusCode, 200,
    `client update resp status error: ${updateResp.body}`
  );
  const { status: updateStatus } = JSON.parse(updateResp.body) as { status: string };
  a.is(updateStatus, "ok", "client update body status not 'ok'");
});

test("should find client entity from cookies", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const expAccountId = ethereumSupport.info.ethereum.didPkh.split(":").slice(2).join("");
  const credential = await issueCredential();
  const loginResp = await fastify.inject({
    method: "POST",
    url: selfLoginClientEP,
    payload: {
      credential: credential,
      captchaToken: "test",
    }
  });
  a.is(loginResp.statusCode, 200, `Client login resp error: ${loginResp.body}`);
  const cookies = toStrCookies(loginResp.cookies);
  const findResp = await fastify.inject({
    method: "GET",
    url: selfFindClientEP,
    headers: {
      cookie: cookies
    }
  });
  a.is(findResp.statusCode, 200, `Client find resp error: ${findResp.body}`);
  const client = JSON.parse(findResp.body) as ClientEntity;
  a.is(client.accountId, expAccountId, "found client entity account id not matched");
});

test.run();
