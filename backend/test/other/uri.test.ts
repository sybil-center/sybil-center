import { suite } from "uvu";
import * as a from "uvu/assert";
import { thrown } from "../support/thrown.support.js";

const test = suite("OTHER: URLs test");

test("should validate URLs", async () => {
  const url = new URL("https://example.com");
  const strURL = url.href;
  a.is(strURL, "https://example.com/", "url not matched");
  const isThrown = await thrown(async () => new URL("hello-test"));
  a.is(isThrown, true, "error has to be thrown after invalid URL");
});

test.run();
