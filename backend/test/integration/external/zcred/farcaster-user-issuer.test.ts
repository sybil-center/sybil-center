import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { FarquestService } from "../../../../src/services/farquest.service.js";
import { FastifyInstance } from "fastify";
import { CanIssueReq, isCanIssue, isChallenge, isHttpCredential, IssueReq, StrictChallengeReq } from "@zcredjs/core";
import { sybil } from "../../../../src/services/sybiljs/index.js";
import * as a from "uvu/assert";
import { testUtil } from "../../../test-util/index.js";
import { ethers } from "ethers";
import sinon from "sinon";
import { EthSignature } from "@zcredjs/ethereum";
import { MinaPoseidonPastaVerifier } from "@zcredjs/mina";
import * as o1js from "o1js";
import { CredentialProver } from "../../../../src/services/credential-provers/index.js";

const Test = suite("farcaster-user credential issuer tests");

let application: App;
let fastify: FastifyInstance;
let farquestService: FarquestService;
let credProver: CredentialProver;

Test.before(async () => {
  application = await App.init();
  fastify = application.context.resolve("httpServer").fastify;
  farquestService = application.context.resolve("farquestService");
  credProver = application.context.resolve("credentialProver");
});

Test.after(async () => {
  await (await application).close();
});

const farquestUserResp = {
  "result": {
    "user": {
      "fid": "4924",
      "followingCount": 93,
      "followerCount": 83,
      "pfp": {
        "url": "https://i.imgur.com/dSw9Fbt.png",
        "verified": false
      },
      "bio": {
        "text": "Doing stuff in Web3",
        "mentions": []
      },
      "external": false,
      "custodyAddress": "0x0645388d822d1c39cbc38e9db3ac8b27797a89d5",
      "connectedAddress": "0xbac675c310721717cd4a37f6cbea1f081b1c2a07",
      "allConnectedAddresses": {
        "ethereum": [
          "0xbac675c310721717cd4a37f6cbea1f081b1c2a07"
        ],
        "solana": []
      },
      "username": "ukstv.eth",
      "displayName": "ukstv",
      "registeredAt": 1693467160149
    }
  },
  "source": "v2"
};

async function beforeIssue(challengeReq: StrictChallengeReq) {

  const challengeResp = await fastify.inject({
    url: sybil.issuerPath("farcaster-user").challenge,
    method: "POST",
    body: challengeReq,
  });
  a.is(
    challengeResp.statusCode, 200,
    `Challenge response status code is not 200. Body: ${challengeResp.body}`
  );
  const challenge = JSON.parse(challengeResp.body);
  a.ok(isChallenge(challenge), `Challenge response body is not challenge`);
  const canIssueReq: CanIssueReq = {
    sessionId: challenge.sessionId
  };
  const canIssueResp = await fastify.inject({
    url: sybil.issuerPath("farcaster-user").canIssue,
    method: "POST",
    body: canIssueReq
  });
  a.is(
    canIssueResp.statusCode, 200,
    `Can issue response status code is not 200. Body: ${canIssueResp.body}`
  );
  const canIssue = JSON.parse(canIssueResp.body);
  a.ok(isCanIssue(canIssue), `Can issue response body is not canIssue JSON`);
  a.ok(canIssue.canIssue, `canIssue.canIssue is not true`);
  return challenge;
}

Test("Issue farcaster user credential", async () => {
  const ethereumAddress = testUtil.ethereum.address;
  const ethereumPrivateKey = testUtil.ethereum.privateKey;
  const STUBS = [
    sinon.stub(farquestService, "getUserByVerifiedAddress").resolves(farquestUserResp),
    sinon.stub(farquestService, "getUserByCustodyAddress").resolves(farquestUserResp)
  ];
  const validUtil = new Date(2030, 0, 1);
  const challenge = await beforeIssue({
    subject: {
      id: {
        type: "ethereum:address",
        key: ethereumAddress
      }
    },
    validUntil: validUtil.toISOString()
  });
  const wallet = new ethers.Wallet(ethereumPrivateKey);
  const hexSignature = await wallet.signMessage(challenge.message);
  const signature = EthSignature.toBase58(hexSignature);
  const issueReq: IssueReq = {
    sessionId: challenge.sessionId,
    signature: signature
  };
  const issueResp = await fastify.inject({
    url: sybil.issuerPath("farcaster-user").issue,
    method: "POST",
    body: issueReq
  });
  a.is(issueResp.statusCode, 200, `Issue response status code is not 200. Body: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body);
  a.ok(isHttpCredential(credential), `Issue response body is not credential`);
  a.ok(
    await testUtil.verifyCredJWS(credential),
    `Farcaster user credential JWS is not verified`
  );
  const prover = credProver.signProver("mina:poseidon-pasta");
  a.ok(
    await new MinaPoseidonPastaVerifier(o1js).verify(credential, prover.issuerReference),
    `Invalid mina:poseidon-pasta zcred signature proof`
  );
  STUBS.forEach((it) => it.restore());
});

Test.run();
