import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { support } from "../../support/index.js";

type TestContext = {
  app: App | undefined;
}

const test = suite<TestContext>("INTEGRATION API: config tests", {
  app: undefined
});

test.before(async (context) => {
  const config = new URL(support.configPath, import.meta.url);
  configDotEnv({ path: config });
  context.app = await App.init();
});

test.after(async ({ app }) => {
  await app?.close();
});

test("should return captchaRequired true", async ({ app }) => {
  const fastify = app!.context.resolve("httpServer").fastify;
  const resp = await fastify.inject({
    method: "GET",
    url: "/api/v1/config/captcha-required"
  });
  a.is(resp.statusCode, 200, `recaptcha required response error: ${resp.body}`);
  const { captchaRequired } = JSON.parse(resp.body) as { captchaRequired: boolean };
  a.is(captchaRequired, true, "captcha required has to be true");
});

// test.run();
