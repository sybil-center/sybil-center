import { suite } from "uvu";
import { App } from "../../src/app/app.js";
import { api } from "../test-support/api/index.js";
import { generateAPIkeysEP } from "../../src/util/route.util.js";
import * as a from "uvu/assert";
import { APIKeys } from "../../src/base/service/api-key.service.js";
import { ethereumSupport } from "../test-support/chain/ethereum.js";

const test = suite("API integration: api key service");

let app: App

test.before(async () => {
  app = new App();
  await app.init();
})

test.after(async () => {
  await app.close();
})

test("should generate and verify api key and secret", async () => {
  const { address: publicId } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const apiKeyService = app.context.resolve("apiKeyService");
  const ethAccountVC = await api.issueEthAccountVC(
    publicId,
    ethereumSupport.sign,
    app
  );
  const apiKeyResp = await fastify.inject({
    method: "POST",
    url: generateAPIkeysEP(),
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
  a.is(fromApiKey, `eip155:1:${publicId}`)
  const { key: fromSecret, isSecret } = await apiKeyService.verify(secretKey);
  a.is(isSecret, true, "secret key verification fail");
  a.is(fromSecret, `eip155:1:${publicId}:secret`)
})

test.run();
