import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon from "sinon";
import { challengeEP, issueEP, ownerProofEP } from "../../../src/util/vc-route-util.js";
import { VCType } from "../../../src/base/model/const/vc-type.js";
import { isValidVC } from "../../../src/util/vc-utils.js";
import { configDotEnv } from "../../../src/util/dotenv.js";
//@ts-ignore
import { ethereumSupport } from "../../support/ethereum.js";
import type {
  EthAccOwnershipIssueVCPayload,
  EthAccOwnershipVC
} from "../../../src/mates/ethereum/issuers/ethereum-account/index.js";
import { EthProofResult } from "../../../src/mates/ethereum/issuers/ethereum-account/index.js";
//@ts-ignore
import { solanaSupport } from "../../support/solana.js";
import { SignAlgAlias } from "../../../src/base/service/multi-sign.service.js";
import { TimedCache } from "../../../src/base/timed-cache.js";
import { AnyObject } from "../../../src/util/model.util.js";

const test = suite("Integration: Issue ETH account ownership vc");

let app: App;

const {
  address: ethAddress,
  privateKey: ethPrivateKey,
  didPkh: ethDidPkh
} = ethereumSupport.info.ethereum;

test.before(async () => {
  const config = new URL("../../test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = new App();
  await app.init();
});

test.after(async () => {
  await app.close();
  sinon.restore();
});

async function preIssue(
  custom?: object
): Promise<{ sessionId: string; issueChallenge: string; ownerChallenge: string }> {
  const fastify = app.context.resolve("httpServer").fastify;
  const payloadResp = await fastify.inject({
    method: "POST",
    url: challengeEP(VCType.EthereumAccount),
    payload: {
      custom: custom
    }
  });
  a.is(
    payloadResp.statusCode,
    200,
    "payload response status code is not 200"
  );
  const { sessionId, issueChallenge, ownerChallenge } = JSON.parse(
    payloadResp.body
  ) as EthAccOwnershipIssueVCPayload;
  return { sessionId, issueChallenge, ownerChallenge };
}

function assertSessionDeleted(sessionId: string) {
  //@ts-ignore
  let { sessionCache } = app.context.resolve("ethereumAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted")
}

test("should issue ethereum account vc", async () => {
  const issuerId = app.context.resolve("didService").id;
  const fastify = app.context.resolve("httpServer").fastify;
  const { issueChallenge, sessionId } = await preIssue();
  const signature = await ethereumSupport.sign(issueChallenge);
  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.EthereumAccount),
    payload: {
      sessionId: sessionId,
      signature: signature,
      publicId: ethAddress
    }
  });
  a.is(vcResp.statusCode, 200, `vc response status code is not 200. body: ${vcResp.body}`);
  const vc = JSON.parse(vcResp.body) as EthAccOwnershipVC;
  a.is(
    vc.credentialSubject.id,
    ethDidPkh,
    "vc credential subject id not matched"
  );
  a.is(vc.issuer.id, issuerId, "issuer id is not matched");
  a.is(vc.credentialSubject.ethereum.address, ethAddress, "eth address is not matched");
  a.is(vc.type.includes(VCType.EthereumAccount), true);
  a.is(vc.credentialSubject.ethereum.address, ethAddress,
    "ethereum address is not matched");
  a.is(await isValidVC(vc), true, "vc is not valid");
  assertSessionDeleted(sessionId);
});

test("should not issue vc because not valid signature", async () => {
  const fastify = app.context.resolve("httpServer").fastify;

  const payloadResp = await fastify.inject({
    method: "POST",
    url: challengeEP(VCType.EthereumAccount)
  });
  a.is(payloadResp.statusCode, 200,
    "payload response status code is not 200");

  const { sessionId, issueChallenge } =
    JSON.parse(payloadResp.body) as EthAccOwnershipIssueVCPayload;

  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.EthereumAccount),
    payload: {
      sessionId: sessionId,
      signature: issueChallenge
    }
  });
  a.is(errResp.statusCode, 400, "error response status code is not 400");
});

test("should issue ethereum account credential with custom property", async () => {
  const issuerId = app.context.resolve("didService").id;
  const { address } = ethereumSupport.info.ethereum;
  const custom = { test: { hello: "world" } };
  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue(custom);
  const signature = await ethereumSupport.sign(issueChallenge);
  const vcResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.EthereumAccount),
    payload: {
      publicId: address,
      signature: signature,
      sessionId: sessionId
    }
  });
  a.is(vcResp.statusCode, 200,
    `vc response status code is not 200. body: ${vcResp.body}`);
  const vc = JSON.parse(vcResp.body) as EthAccOwnershipVC;
  const { custom: vcCustom } = vc.credentialSubject;
  a.is(vc.issuer.id, issuerId, "issuer id is not matched");
  a.ok(vcCustom, "custom is not present");
  a.ok(vcCustom.test, "custom.test is not present");
  a.ok(vcCustom.test.hello, "custom.test.hello is not present");
  a.is(
    vcCustom.test.hello,
    "world",
    "hello custom property is not matched"
  );
  assertSessionDeleted(sessionId);
});

test("issue ethereum account credential with different subject and address", async () => {
  const {
    didPkh: solanaDidPkh,
    address: solanaAddress
  } = solanaSupport.info;
  const {
    address: ethAddress
  } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { issueChallenge, sessionId, ownerChallenge } = await preIssue();
  const ethSignature = await ethereumSupport.sign(ownerChallenge);
  const ethSignAlg: SignAlgAlias = "ethereum";
  const ownerProofResp = await fastify.inject({
    method: "POST",
    url: ownerProofEP(VCType.EthereumAccount),
    payload: {
      signature: ethSignature,
      signAlg: ethSignAlg,
      sessionId: sessionId,
      publicId: ethAddress
    }
  });
  a.is(ownerProofResp.statusCode, 200,
    `callback response status is not matched. body: ${ownerProofResp.body}`);
  const proofResult = JSON.parse(ownerProofResp.body) as EthProofResult;
  a.is(proofResult.chainId, "eip155:1", `proof result chain id is not matched`);
  a.is(proofResult.address, ethAddress, `proof result address is not matched`);

  const solanaSignature = await solanaSupport.sign(issueChallenge);
  const solanaSignAlg: SignAlgAlias = "solana";
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP(VCType.EthereumAccount),
    payload: {
      signature: solanaSignature,
      publicId: solanaAddress,
      sessionId: sessionId,
      signAlg: solanaSignAlg
    }
  });
  a.is(issueResp.statusCode, 200, "issue resp status is not matched");
  const vc = JSON.parse(issueResp.body) as EthAccOwnershipVC;
  a.is(vc.credentialSubject.id, solanaDidPkh, "subject id is not matched");
  a.is(vc.credentialSubject.ethereum.address, ethAddress, "ethereum address is not matched");
  assertSessionDeleted(sessionId);
});

test.run();
