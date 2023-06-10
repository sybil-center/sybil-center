import { suite } from "uvu";
import * as a from "uvu/assert";
import { subjectIdRegExp } from "../../../src/util/route.util.js";

const test = suite("UNIT: route util test");

test("should create correct regexp from prefix list", () => {
  const regexp = "^(did:pkh:eip155:1:.+|eip155:1:.+|ethereum:.+)";
  const result = subjectIdRegExp(["did:pkh:eip155:1", "eip155:1", "ethereum"]);
  a.is(result, regexp, "regexp is not matched");
});

test.run();
