import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { challengeEP } from "@sybil-center/sdk/util";
import { ethereumSupport } from "../../test-support/chain/ethereum.js";

const test = suite("Custom property size limit test");

let app: App;

test.before(async () => {
  const globalTestConf = new URL("../../test.env", import.meta.url);
  const localTestConf = new URL("./test.env", import.meta.url);
  configDotEnv({ path: globalTestConf, override: true });
  configDotEnv({ path: localTestConf, override: true });
  app = new App();
  await app.init();
});

test.after(async () => {
  await app.close();
});

test("should throw client error because custom property is too large", async () => {
  const { fastify } = app.context.resolve("httpServer");
  const config = app.context.resolve("config");
  const publicId = ethereumSupport.info.ethereum.address;
  const errResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    payload: {
      custom: { message: "tests are good, no tests are bugs" },
      publicId: publicId
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