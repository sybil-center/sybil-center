import { App } from "../../src/app/app.js";
import { configDotEnv } from "../../src/util/dotenv.js";

export async function appBuild(): Promise<App> {
  configDotEnv({
    path: new URL("../test.env", import.meta.url),
    override: true,
  });
  const app = new App();
  await app.init();
  return app;
}
