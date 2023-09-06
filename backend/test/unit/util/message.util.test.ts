import { suite } from "uvu";
import * as a from "uvu/assert";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import { fromIssueMessage, toIssueMessage } from "../../../src/util/message.util.js";
import { CredentialType } from "@sybil-center/sdk";

const test = suite("UNIT: challenge service test");

const subjectId = ethereumSupport.info.ethereum.didPkh;

test("issue challenge message create and parse without props", () => {
  const type: CredentialType = "DiscordAccount";
  const msg = toIssueMessage({
    subjectId: subjectId,
    type: "DiscordAccount",
  });
  const challenge = fromIssueMessage(msg);
  a.is(
    challenge.description, `Sign the message to prove your Discord account ownership and issue appropriate credential`,
    "incorrect description"
  );
  a.is(challenge.type, type, "Challenge credential type is not matched");
  a.is(challenge.subjectId, subjectId, `Challenge subject id is not matched`);
  a.not.ok(challenge.ethereumProps);
  a.not.ok(challenge.discordProps);
  a.not.ok(challenge.twitterProps);
  a.not.ok(challenge.githubProps);
});

test("issue challenge message create and parse with empty props", () => {
  const msg = toIssueMessage({
    subjectId: subjectId,
    type: "DiscordAccount",
    discordProps: { value: [], default: ["empty"] },
    ethereumProps: { value: [], default: ["empty"] },
    githubProps: { value: [], default: ["empty"] },
    twitterProps: { value: [], default: ["empty"] }
  });
  const { discordProps, ethereumProps, githubProps, twitterProps } = fromIssueMessage(msg);
  a.is(discordProps?.length, 0, "discord props is not empty");
  a.is(ethereumProps?.length, 0, "ethereum props is not empty");
  a.is(githubProps?.length, 0, "github props is not empty");
  a.is(twitterProps?.length, 0, "twitter props is not empty");
});

test("issue challenge message create and parse with default props", () => {
  const msg = toIssueMessage({
    subjectId: subjectId,
    type: "GitHubAccount",
    discordProps: { default: ["discordAccount"] },
    githubProps: { default: ["githubAccount"] },
    twitterProps: { default: ["twitterAccount"] },
    ethereumProps: { default: ["ethereumAccount"] }
  });
  const { githubProps, discordProps, ethereumProps, twitterProps } = fromIssueMessage(msg);
  a.ok(githubProps);
  a.ok(discordProps);
  a.ok(ethereumProps);
  a.ok(twitterProps);

  a.is(githubProps?.at(0), "githubAccount", "githubProps is not matched");
  a.is(discordProps?.at(0), "discordAccount", "discord array is not matched");
  a.is(ethereumProps?.at(0), "ethereumAccount", "ethereum props is not matched");
  a.is(twitterProps?.at(0), "twitterAccount", "twitter props is not matched");
});

test("issue challenge create and parse with custom property", () => {
  const customOrigin = {
    hello: {
      from: "world",
      list: [
        "test",
        true,
        false,
        { hello: "test" }
      ]
    },
    test: "this is test"
  };
  const msg = toIssueMessage({
    subjectId: subjectId,
    type: "TwitterAccount",
    custom: customOrigin
  });

  const { custom } = fromIssueMessage(msg);
  a.is(custom?.hello?.from, customOrigin.hello.from, "custom property is not matched");
  a.is(custom?.hello?.list[0], customOrigin.hello.list[0], "custom property is not matched");
  a.is(custom?.hello?.list[1], customOrigin.hello.list[1], "custom property is not matched");
  a.is(custom?.hello?.list[2], customOrigin.hello.list[2], "custom property is not matched");
  //@ts-ignore
  a.is(custom?.hello?.list[3].hello, customOrigin.hello.list[3].hello, "custom property is not matched");
  a.is(custom?.test, customOrigin.test, "custom property is not matched");
});

test("issue challenge message create and parse with expiration date", () => {
  const date = new Date();
  const msg = toIssueMessage({
    subjectId: subjectId,
    type: "EthereumAccount",
    expirationDate: date
  });
  const challenge = fromIssueMessage(msg);
  a.is(
    challenge.expirationDate?.toISOString(), date.toISOString(),
    "challenge expiration date is not matched"
  );
});

test.run();
