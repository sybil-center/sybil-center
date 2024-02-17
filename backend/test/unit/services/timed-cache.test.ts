import { suite } from "uvu";
import { randomUUID } from "crypto";
import * as a from "uvu/assert";
import { TimedCache } from "../../../src/services/timed-cache.js";
import { delay } from "../../../src/util/delay.util.js";

const test = suite("UNIT: timed cache test");

test("get same message which was set", async () => {
  const cacheService = new TimedCache(100);

  const msg = randomUUID();
  const id = randomUUID();
  cacheService.set(id, msg);

  const received = cacheService.get(id);
  a.is(msg, received, "messages are not equals");
  cacheService.dispose();
});

test("delete message after ttl", async () => {
  const TTL = 5;
  const cacheService = new TimedCache(TTL);

  const msgId = randomUUID();
  const msg = randomUUID();
  cacheService.set(msgId, msg);
  await delay(TTL * 2);
  a.throws(() => {
    cacheService.get(msgId);
  });
  cacheService.dispose();
});

test.run();
