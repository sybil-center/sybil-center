import { test } from "uvu";
import * as assert from "uvu/assert";
import { TwitterApi } from "twitter-api-v2";
import * as url from "url";

test("should build correct url and state", async () => {
  const twitterApi = new TwitterApi({ clientId: "id", clientSecret: "secret" });
  const {
    url: authUrl,
    codeVerifier,
    state,
  } = twitterApi.generateOAuth2AuthLink("http://test", {
    scope: ["users.read"],
    state: "hello state",
  });
  const query = url.parse(authUrl, true).query;
  const stateFromUrl = query["state"];

  assert.is(
    stateFromUrl,
    "hello state",
    "state from url and actual state is not matched"
  );
  assert.is(state, "hello state", "state is not matched");
  assert.ok(codeVerifier, "verification code have to present");
});

test.run();
