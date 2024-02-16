import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";

const test = suite("INTEGRATION INTERNAL: App instance test");

test("should correct work", async () => {
  configDotEnv({ path: support.configPath, override: true });
  const app = await App.init();
  await app.close();
});

test.run();
