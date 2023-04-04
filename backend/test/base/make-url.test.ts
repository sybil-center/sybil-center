import { test } from "uvu";
import * as a from "uvu/assert";
import { makeURL } from "../../src/util/make-url.util.js";

test("makeURL", async () => {
  const expectUrl = "http://hello/world?id=123#test";
  const actual = makeURL(
    "http://hello/world",
    {
      id: "123",
    },
    "test"
  );
  a.equal(actual.href, expectUrl);
});

test.run();
