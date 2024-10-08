import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { testUtil } from "../../../test-util/index.js";

const test = suite("INTEGRATION INTERNAL: App instance test");

test("should correct work", async () => {
  configDotEnv({ path: testUtil.envPath, override: true });
  const app = await App.init();
  await app.close();
});

test.run();
