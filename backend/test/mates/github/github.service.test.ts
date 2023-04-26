import { suite } from "uvu";
import { GitHubService } from "../../../src/mates/github/github.service.js";
import sinon, { stub } from "sinon";
import { rest } from "../../../src/util/fetch.util.js";
import * as a from "uvu/assert";

const test = suite("Github service tests");

const accessToken = "access_token";
const username = `test-${Math.floor(Math.random() * 1000)}`;
const gitHubUserUrl = `https://api.github.com/${username}`;
const id = 1337;
const userPage = "test.com";

test("should correct receive github user entity", async () => {
  stub(rest, "fetchJson").resolves({
    html_url: userPage,
    login: username,
    id: id,
    url: gitHubUserUrl,
    name: "test"
  });
  const gitHubService = new GitHubService({
    pathToExposeDomain: new URL("https://test.com"),
    gitHubClientId: "",
    gitHubClientSecret: ""
  });
  const githubUser = await gitHubService.getUser(accessToken);
  a.is(githubUser.username, username, "Github username is not matched");
  a.is(githubUser.id, id, "Github user id is not matched");
  a.is(githubUser.userPage, userPage, "Github user page is not matched");

  sinon.restore();
});

test.run();
