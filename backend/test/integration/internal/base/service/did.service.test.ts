import { suite } from "uvu";
import * as a from "uvu/assert";
import { getPayload, toJWS } from "../../../../../src/util/jwt.util.js";
import sortKeys from "sort-keys";
import { DIDService } from "../../../../../src/base/service/did.service.js";
import { createInjector } from "typed-inject";
import { Config } from "../../../../../src/backbone/config.js";
import { Logger } from "../../../../../src/backbone/logger.js";

const test = suite("INTEGRATION: did service test");

const unordered = {
  A: { d: "a", a: "d", c: "c" },
  a: [{ c: "a", a: "c" }],
  c: ["VER", "ACB"],
};
const ordered = sortKeys(unordered, { deep: true });

/**
 * When {@link DID#createJWS} sign input as json object, it's deep ordered by key.
 * Therefore, you MUST order VC when issue it
 */
test("should order payload from jws", async () => {
  const pathToConfig = new URL("../../../../env-config/test.env", import.meta.url);

  const didService = createInjector()
    .provideValue("config", new Config(pathToConfig))
    .provideClass("logger", Logger)
    .injectClass(DIDService);
  await didService.init();

  const dagJWS = await didService.createJWS(unordered);
  const jws = toJWS(dagJWS);
  const payload = getPayload(jws);

  a.is(payload, JSON.stringify(ordered));
  a.is.not(payload, JSON.stringify(unordered));
});

test.run();
