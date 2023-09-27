import { suite } from "uvu";
import { Field, Poseidon, PublicKey, Scalar, Signature } from "snarkyjs";
import * as a from "uvu/assert";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import sinon, { stub } from "sinon";
import { FastifyInstance } from "fastify";
import { GitChallenge, GitChallengeReq } from "../../../../src/issuers/zkc/github-account/index.js";
import * as url from "url";
import { minaSupport } from "../../../support/chain/mina.js";
import { oauthCallbackEP } from "../../../../src/util/route.util.js";
import { Raw, ZkcCanIssueResp, ZkcIssueReq } from "../../../../src/base/types/zkc.issuer.js";
import Client from "mina-signer";
import { ZkCredProved } from "../../../../src/base/types/zkc.credential.js";
import { Zkc } from "../../../../src/util/zk-credentials/index.js";

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

type PreIssueArgs = {
  network?: "mainnet" | "testnet";

}

async function preIssue({ network }: PreIssueArgs): Promise<{
  sessionId: string;
  signature: string;
}> {
  const challengeReq: Raw<GitChallengeReq> = {
    subjectId: {
      t: "mina",
      k: minaSupport.publicKey
    },
    redirectUrl: redirectURL,
    options: {
      network: network
    }
  };

  const challengeResp = await fastify.inject({
    method: "POST",
    url: Zkc.EPs.v1("GitHubAccount").challenge,
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
    url: Zkc.EPs.v1("GitHubAccount").canIssue,
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
    url: Zkc.EPs.v1("GitHubAccount").canIssue,
    query: { sessionId: challenge.sessionId }
  });
  a.is(
    canIssueResp.statusCode, 200,
    `can issue after callback resp status code is not 200. error: ${canIssueResp.body}`
  );
  const { canIssue: canIssueAfter } =
    JSON.parse(canIssueResp.body) as ZkcCanIssueResp;
  a.is(canIssueAfter, true, `can issue after callback is not true`);

  const client = new Client({ network: network ? network : "mainnet" });
  const sign = client.signMessage(challenge.message, minaSupport.privateKey);
  const signature = Signature.fromObject({
    r: Field.fromJSON(sign.signature.field),
    s: Scalar.fromJSON(sign.signature.scalar)
  }).toBase58();

  return {
    sessionId: challenge.sessionId,
    signature: signature
  };
}


test(`Issue Github account zkc & verify for Mina (Main net)`, async () => {

  const { sessionId, signature } = await preIssue({});

  const issueReq: ZkcIssueReq = {
    sessionId: sessionId,
    signature: signature
  };

  const issueResp = await fastify.inject({
    method: "POST",
    url: Zkc.EPs.v1("GitHubAccount").issue,
    payload: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `issue response status code is not 200. error: ${issueResp.body}`
  );
  const credProofed = JSON.parse(issueResp.body) as ZkCredProved;
  a.is(credProofed.isr.id.t, 0, "Issuer Mina id type is not matched");
  const proof = credProofed.proof[0]!;

  //@ts-ignore
  credProofed.proof = undefined;
  const prepared = Zkc.preparator.prepare<Field[]>(credProofed, proof.transformSchema);
  const msg = Poseidon.hash(prepared);
  const sign = Signature.fromBase58(proof.sign);
  const verified = sign.verify(PublicKey.fromBase58(proof.key), [msg]);
  a.is(verified.toJSON(), true, `Signature is not verified`);
});

test(`Issue Github account zkc & verify for Mina (Test net)`, async () => {
  const { sessionId, signature } = await preIssue({ network: "testnet" });
  const issueReq: ZkcIssueReq = {
    sessionId: sessionId,
    signature: signature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: Zkc.EPs.v1("GitHubAccount").issue,
    payload: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    "Issue resp status code is not 200"
  );
  const credProved: ZkCredProved = JSON.parse(issueResp.body);
  const proof = credProved.proof[0]!;
  a.ok(proof, "Proof in Zk credential is undefined");
  // @ts-ignore
  credProved.proof = undefined;
  const prepared = Zkc.preparator.prepare<Field[]>(credProved, proof.transformSchema);
  const msg = Poseidon.hash(prepared);
  const sign = Signature.fromBase58(proof.sign);
  const verified = sign.verify(PublicKey.fromBase58(proof.key), [msg]);
  a.is(verified.toJSON(), true, `Signature is not verified`);
});

test.run();
