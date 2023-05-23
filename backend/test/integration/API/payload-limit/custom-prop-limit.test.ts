import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { challengeEP } from "@sybil-center/sdk/util";
import { ethereumSupport } from "../../../support/chain/ethereum.js";
import { appSup } from "../../../support/app/index.js";

const test = suite("INTEGRATION API: Custom property size limit test");

let app: App;
let apiKey: string;

test.before(async () => {
  const globalTestConf = new URL("../../../env-config/test.env", import.meta.url);
  const localTestConf = new URL("./test.env", import.meta.url);
  configDotEnv({ path: globalTestConf, override: true });
  configDotEnv({ path: localTestConf, override: true });
  app = await App.init();
  const keys = await appSup.apiKeys(app);
  apiKey = keys.apiKey;
});

test.after(async () => {
  await app.close();
});

test("should throw client error because custom property is too large", async () => {
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const didPkh = ethereumSupport.info.ethereum.didPkh;
  const errResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      custom: { message: "tests are good, no tests are bugs" },
      subjectId: didPkh
    },
  });
  a.is(errResp.statusCode, 400, "err resp status code is not 400");
  const { message: errMessage } = JSON.parse(errResp.body) as {
    message: string;
  };
  a.is(
    errMessage,
    `"custom" property is too large. Bytes limit is ${config.customSizeLimit}`
  );
});

test.run();
