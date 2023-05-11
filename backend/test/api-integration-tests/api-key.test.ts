import { suite } from "uvu";
import { App } from "../../src/app/app.js";
import { api } from "../test-support/api/index.js";
import { generateAPIkeysEP } from "../../src/util/route.util.js";
import * as a from "uvu/assert";
import { ethereumSupport } from "../test-support/chain/ethereum.js";
import { APIKeys } from "@sybil-center/sdk/types";
import { configDotEnv } from "../../src/util/dotenv.util.js";

const test = suite("API integration: api key service");

let app: App;

test.before(async () => {
  const config = new URL("../test.env", import.meta.url);
  configDotEnv({ path: config, override: true });

  app = await App.init();
});

test.after(async () => {
  await app.close();
});

test("should generate and verify api key and secret", async () => {
  const { didPkh, address } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const frontendDomain = app.context.resolve("config").frontendOrigin;
  const apiKeyService = app.context.resolve("apiKeyService");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 3);
  const ethAccountVC = await api.issueEthAccountVC(
    didPkh,
    ethereumSupport.sign,
    app,
    { expirationDate: expirationDate }
  );
  const apiKeyResp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      ...ethAccountVC
    }
  });
  a.is(
    apiKeyResp.statusCode, 200,
    `api key response fail. error: ${apiKeyResp.body}`
  );
  const { apiKey, secretKey } = JSON.parse(apiKeyResp.body) as APIKeys;
  const { key: fromApiKey, isSecret: notSecret } = await apiKeyService.verify(apiKey);
  a.is(notSecret, false, "api key verification fail");
  a.is(fromApiKey, `eip155:1:${address}`);
  const { key: fromSecret, isSecret } = await apiKeyService.verify(secretKey);
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
  a.is(throwFailApikey, true, "fail api key is verified");

  const secretChars = secretKey.split("");
  secretChars[secretChars.length - 2] = "0";
  secretChars[secretChars.length - 3] = "0";
  secretChars[secretChars.length - 4] = "0";
  const failSecretkey = secretChars.join("");
  let throwFailSecretkey = false;
  try {
    await apiKeyService.verify(failSecretkey);
  } catch (e) { throwFailSecretkey = true; }
  a.is(throwFailSecretkey, true, "fail api secret is verified");
});

test("should not generate api keys because expiration date undefined", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const frontendDomain = app.context.resolve("config").frontendOrigin;
  const fastify = app.context.resolve("httpServer").fastify;
  const ethAccountVC = await api.issueEthAccountVC(
    didPkh,
    ethereumSupport.sign,
    app,
  );
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      ...ethAccountVC
    }
  });
  a.is(resp.statusCode, 400, `${resp.body}`);
});

test("should not generate api keys because expiration date is too large", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const {
    frontendOrigin: frontendDomain,
    apiKeysCredentialTTL
  } = app.context.resolve("config");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + apiKeysCredentialTTL + 1);
  const ethAccountVC = await api.issueEthAccountVC(
    didPkh,
    ethereumSupport.sign,
    app,
    { expirationDate: expirationDate }
  );
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": frontendDomain.href
    },
    payload: {
      ...ethAccountVC
    }
  });
  a.is(resp.statusCode, 400, `${resp.body}`);
  const errMsg = JSON.parse(resp.body).message;
  a.is(errMsg, `Credential TTL must be less then ${apiKeysCredentialTTL} MS`);
});

test("should reject api keys generation because incorrect Referer header", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 5);
  const ethAccountVC = await api.issueEthAccountVC(
    didPkh,
    ethereumSupport.sign,
    app,
    { expirationDate: expirationDate }
  );
  const resp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
    headers: {
      "Referer": "https://example.com"
    },
    payload: {
      ...ethAccountVC
    }
  });
  a.is(resp.statusCode, 403, `${resp.body}`);
});

test.run();
