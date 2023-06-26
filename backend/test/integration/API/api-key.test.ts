import { suite } from "uvu";
import { App } from "../../../src/app/app.js";
import { appSup } from "../../support/app/index.js";
import { generateAPIkeysEP } from "../../../src/util/route.util.js";
import * as a from "uvu/assert";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import { APIKeys } from "@sybil-center/sdk/types";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import sinon from "sinon";

const test = suite("INTEGRATION API: app key service test");

let app: App;

test.before(async () => {
  const config = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = await App.init();
  const captchaService = app.context.resolve("captchaService");
  sinon.stub(captchaService, "isHuman").resolves({
    isHuman: true,
    score: 0.9,
    reasons: []
  });
});

test.after(async () => {
  sinon.restore();
  await app.close();
});

test("should generate and verify app key and secret", async () => {
  const { didPkh, address } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const frontendDomain = app.context.resolve("config").frontendOrigin;
  const apiKeyService = app.context.resolve("apikeyService");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 3);
  const ethAccountVC = await appSup.issueEthAccountVC({
    subjectId: didPkh,
    signFn: ethereumSupport.sign,
    app: app,
    opt: { expirationDate: expirationDate }
  });
  const apiKeyResp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      credential: ethAccountVC,
      captchaToken: "test"
    }
  });
  a.is(
    apiKeyResp.statusCode, 200,
    `api key response fail. error: ${apiKeyResp.body}`
  );
  const { apiKey, secretKey } = JSON.parse(apiKeyResp.body) as APIKeys;
  const { originKey: fromApiKey, isSecret: notSecret } = await apiKeyService.verify(apiKey);
  a.is(notSecret, false, "app key verification fail");
  a.is(fromApiKey, `eip155:1:${address}`);
  const { originKey: fromSecret, isSecret } = await apiKeyService.verify(secretKey);
  a.is(isSecret, true, "secret key verification fail");
  a.is(fromSecret, `eip155:1:${address}`);

  const apikeyChars = apiKey.split("");
  apikeyChars[apikeyChars.length - 2] = "w";
  apikeyChars[apikeyChars.length - 3] = "w";
  apikeyChars[apikeyChars.length - 4] = "w";
  const failApikey = apikeyChars.join("");

  let throwFailApikey = false;
  try {
    await apiKeyService.verify(failApikey);
  } catch (e) { throwFailApikey = true; }
  a.is(throwFailApikey, true, "fail app key is verified");

  const secretChars = secretKey.split("");
  secretChars[secretChars.length - 2] = "0";
  secretChars[secretChars.length - 3] = "0";
  secretChars[secretChars.length - 4] = "0";
  const failSecretkey = secretChars.join("");
  let throwFailSecretkey = false;
  try {
    await apiKeyService.verify(failSecretkey);
  } catch (e) { throwFailSecretkey = true; }
  a.is(throwFailSecretkey, true, "fail app secret is verified");
});

test("should not generate app keys because expiration date undefined", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const frontendDomain = app.context.resolve("config").frontendOrigin;
  const fastify = app.context.resolve("httpServer").fastify;
  const ethAccountVC = await appSup.issueEthAccountVC({
    subjectId: didPkh,
    signFn: ethereumSupport.sign,
    app: app,
  });
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      credential: ethAccountVC,
      captchaToken: "test"
    }
  });
  a.is(resp.statusCode, 400, `${resp.body}`);
});

test("should not generate app keys because expiration date is too large", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const {
    frontendOrigin: frontendDomain,
    apiKeysCredentialTTL
  } = app.context.resolve("config");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + apiKeysCredentialTTL + 1);
  const ethAccountVC = await appSup.issueEthAccountVC(
    {
      subjectId: didPkh,
      signFn: ethereumSupport.sign,
      app: app,
      opt: { expirationDate: expirationDate }
    }
  );
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      credential: ethAccountVC,
      captchaToken: "test"
    }
  });
  a.is(resp.statusCode, 400, `${resp.body}`);
  const errMsg = JSON.parse(resp.body).message;
  a.is(errMsg, `Credential TTL must be less then ${apiKeysCredentialTTL} MS`);
});

test("should reject app keys generation because incorrect Referer header", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 5);
  const ethAccountVC = await appSup.issueEthAccountVC({
    subjectId: didPkh,
    signFn: ethereumSupport.sign,
    app: app,
    opt: { expirationDate: expirationDate }
  });
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": "https://example.com"
    },
    payload: {
      credential: ethAccountVC,
      captchaToken: "test"
    }
  });
  a.is(resp.statusCode, 403, `${resp.body}`);
});

test.run();
