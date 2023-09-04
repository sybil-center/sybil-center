import { suite } from "uvu";
import { Field, Poseidon, PublicKey, Scalar, Signature } from "snarkyjs";
import * as a from "uvu/assert";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import sinon, { stub } from "sinon";
import { FastifyInstance } from "fastify";
import { zkc } from "../../../../src/util/zk-credentials.util.js";
import { GitChallenge, GitChallengeReq } from "../../../../src/issuers/zkc/github-account/index.js";
import * as url from "url";
import { minaSupport } from "../../../support/chain/mina.js";
import { oauthCallbackEP } from "../../../../src/util/route.util.js";
import { ZkcCanIssueResp, ZkcIssueReq } from "../../../../src/base/types/zkc.issuer.js";
import Client from "mina-signer";
import { ZkCredProofed } from "../../../../src/base/types/zkc.credential.js";

const test = suite("INTEGRATION API: issue Github Account ZKC test");

let app: App;
let fastify: FastifyInstance;

const redirectURL = "https://exmaple.com/";
const oauthCode = "oauthCode";
const accessToken = "access_token";
const githubUser = {
  id: 10,
  username: "test-username",
  userPage: `https://github.com/test-username`
};

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;

  const githubService = app.context
    .resolve("zkcGitHubAccountIssuer")
    //@ts-ignore
    .githubService;

  stub(githubService, "getAccessToken").resolves(accessToken);
  stub(githubService, "getUser").resolves(githubUser);
});

test.after(async () => {
  sinon.restore();
  await app.close();
});


test(`Issue Github account zkc & verify for Mina`, async () => {

  const challengeReq: GitChallengeReq = {
    sbjId: {
      t: "mina",
      k: minaSupport.publicKey
    },
    redirectUrl: redirectURL
  };

  const challengeResp = await fastify.inject({
    method: "POST",
    url: zkc.EPs.v1("GitHubAccount").challenge,
    payload: challengeReq
  });
  a.is(challengeResp.statusCode, 200, `Challenge response status code is not 200`);

  const challenge = JSON.parse(challengeResp.body) as GitChallenge;
  a.ok(challenge.authUrl, `challenge MUST contain "authUrl"`);
  a.ok(challenge.message, `challenge MUST contain "message"`);
  a.ok(challenge.sessionId, `challenge MUST contain "sessionId"`);

  const { query } = url.parse(challenge.authUrl, true);
  const state = query.state as string;
  a.type(state, "string");

  const canIssueBefore = await fastify.inject({
    method: "GET",
    url: zkc.EPs.v1("GitHubAccount").canIssue,
    query: {
      sessionId: challenge.sessionId
    }
  });
  a.is(
    canIssueBefore.statusCode, 200,
    `can issue before callback resp status code is not 200. error ${canIssueBefore.body}`
  );
  const {
    canIssue: canIssBefore
  } = JSON.parse(canIssueBefore.body) as ZkcCanIssueResp;

  a.is(canIssBefore, false, `can issue before MUST be false`);

  const callbackResp = await fastify.inject({
    method: "GET",
    url: oauthCallbackEP(),
    query: {
      code: oauthCode,
      state: state
    }
  });
  a.is(
    callbackResp.statusCode, 302,
    `oauth callback status code is not 302. error: ${callbackResp.body}`
  );
  const redirectTo = callbackResp.headers.location as string;
  a.is(
    redirectTo, redirectURL,
    `redirect url is not matched.`
  );

  const canIssueResp = await fastify.inject({
    method: "GET",
    url: zkc.EPs.v1("GitHubAccount").canIssue,
    query: { sessionId: challenge.sessionId }
  });
  a.is(
    canIssueResp.statusCode, 200,
    `can issue after callback resp status code is not 200. error: ${canIssueResp.body}`
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueResp.body) as ZkcCanIssueResp;
  a.is(canIssueAfter, true, `can issue after callback is not true`);

  const client = new Client({ network: "mainnet" });
  const sign = client.signMessage(challenge.message, minaSupport.privateKey);

  const issueReq: ZkcIssueReq = {
    sessionId: challenge.sessionId,
    signature: Signature.fromObject({
      r: Field.fromJSON(sign.signature.field),
      s: Scalar.fromJSON(sign.signature.scalar)
    }).toBase58()
  };

  const issueResp = await fastify.inject({
    method: "POST",
    url: zkc.EPs.v1("GitHubAccount").issue,
    payload: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `issue response status code is not 200. error: ${issueResp.body}`
  );
  const credProofed = JSON.parse(issueResp.body) as ZkCredProofed;
  const proof = credProofed.proof[0]!;

  //@ts-ignore
  credProofed.proof = undefined;
  const prepared = zkc.preparator.prepare<Field[]>(credProofed, proof.transformSchema);
  const msg = Poseidon.hash(prepared);
  const signature = Signature.fromBase58(proof.sign);
  const verified = signature.verify(PublicKey.fromBase58(proof.key), [msg]);
  a.is(verified.toJSON(), true, `Signature is not verified`);
});


test.run();
