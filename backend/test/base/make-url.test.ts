import { test } from "uvu";
import * as assert from "uvu/assert";
import { makeURL } from "../../src/base/make-url.util.js";

test("makeURL", async () => {
  const expectUrl = "http://hello/world?id=123#test";
  const actual = makeURL(
    "http://hello/world",
    {
      id: "123",
    },
    "test"
  );
  assert.equal(actual.href, expectUrl);
});

test.run();
