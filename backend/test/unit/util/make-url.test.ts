import { suite } from "uvu";
import * as a from "uvu/assert";
import { makeURL } from "../../../src/util/url.util.js";

const test = suite("UNIT: make url util test");

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
