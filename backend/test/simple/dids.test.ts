import { test } from "uvu";
import * as assert from "uvu/assert";
import { getPayload, toJWS } from "../../src/util/jwt.js";
import sortKeys from "sort-keys";
import { DIDService } from "../../src/base/service/did-service.js";
import { createInjector } from "typed-inject";
import { Config } from "../../src/backbone/config.js";
import { Logger } from "../../src/backbone/logger.js";

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
  const pathToConfig = new URL("../test.env", import.meta.url);

  const didService = createInjector()
    .provideValue("config", new Config(pathToConfig))
    .provideClass("logger", Logger)
    .injectClass(DIDService);
  await didService.init();

  const dagJWS = await didService.createJWS(unordered);
  const jws = toJWS(dagJWS);
  const payload = getPayload(jws);

  assert.is(payload, JSON.stringify(ordered));
  assert.is.not(payload, JSON.stringify(unordered));
});

test.run();
