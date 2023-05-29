import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";

const test = suite("INTEGRATION API: config tests");

let app: App;

test.before(async () => {
  const config = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: config });
  app = await App.init();
});

test.after(async () => {
  await app.close();
});

test("should return captchaRequired true", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const resp = await fastify.inject({
    method: "GET",
    url: "/api/v1/config/captcha-required"
  });
  a.is(resp.statusCode, 200, `recaptcha required response error: ${resp.body}`);
  const { captchaRequired } = JSON.parse(resp.body) as { captchaRequired: boolean };
  a.is(captchaRequired, true, "captcha required has to be true");
});

test.run()
