import { suite } from "uvu";
import { App } from "../../src/app/app.js";
import { configDotEnv } from "../../src/util/dotenv.util.js";

const test = suite("App instance test");

test("should correct work", async () => {
  const testConfig = new URL("../test.env", import.meta.url);
  configDotEnv({ path: testConfig, override: true });
  const app = await App.init();
  await app.close();
});

test.run();
