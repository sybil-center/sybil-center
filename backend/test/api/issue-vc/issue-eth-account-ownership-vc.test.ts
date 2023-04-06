import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon from "sinon";
import { challengeEP, issueEP, ownerProofEP } from "@sybil-center/sdk/util";
import { isValidVC } from "../../../src/util/credential.utils.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
//@ts-ignore
import { ethereumSupport } from "../../support/ethereum.js";
import { EthAccountChallenge, EthAccountVC, SignType } from "@sybil-center/sdk/types";
import { EthProofResult } from "../../../src/mates/ethereum/issuers/ethereum-account/index.js";
//@ts-ignore
import { solanaSupport } from "../../support/solana.js";
import { AnyObj } from "../../../src/util/model.util.js";
import { LightMyRequestResponse } from "fastify";

const test = suite("Integration: Issue ETH account ownership vc");

let app: App;

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

type PreIssueEntry = {
  publicId: string;
  ethAddress?: string;
  custom?: AnyObj,
  expirationDate?: Date,
}
const preIssue = async (
  args: PreIssueEntry
): Promise<{
  sessionId: string;
  issueChallenge: string;
  ownerChallenge?: string
}> => {
  const fastify = app.context.resolve("httpServer").fastify;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    payload: {
      publicId: args.publicId,
      ethAddress: args.ethAddress,
      custom: args.custom,
      expirationDate: args.expirationDate,
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    "challenge response status code is not 200"
  );
  const { sessionId, issueChallenge, ownerChallenge } = JSON.parse(
    challengeResp.body
  ) as EthAccountChallenge;
  return { sessionId, issueChallenge, ownerChallenge };
};

type AssertIssueRespArgs = {
  issueResp: LightMyRequestResponse,
  subjectDID: string,
  ethereumAddress: string;
}

const assertIssueResp = async ({
  issueResp,
  subjectDID,
  ethereumAddress
}: AssertIssueRespArgs) => {
  const issuerDID = app.context.resolve("didService").id;
  a.is(
    issueResp.statusCode, 200,
    `issue resp status code is not 200. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  a.is(
    credential.issuer.id, issuerDID,
    "issuer id is not matched"
  );
  a.is(
    credential.credentialSubject.id, subjectDID,
    "credential subject did is not matched"
  );
  a.is(
    credential.type[0], "VerifiableCredential",
    "credential type first item is not correct"
  );
  a.is(
    credential.type[1], "EthereumAccount",
    "credential type second item is not correct"
  );
  a.is(
    credential.credentialSubject.ethereum.address, ethereumAddress,
    "credential subject ethereum address is not matched"
  );
  a.is(
    credential.credentialSubject.ethereum.chainId, "eip155:1",
    "credential subject ethereum chain id is not matched"
  );
  a.is(
    await isValidVC(credential), true,
    "credential is not valid"
  );

};

const assertSessionDeleted = (sessionId: string) => {
  //@ts-ignore
  let { sessionCache } = app.context.resolve("ethereumAccountIssuer");
  a.throws(() => {
    sessionCache.get(sessionId);
  }, "session is not deleted");
};

test("should issue ethereum account vc", async () => {
  const {
    address: ethAddress,
    didPkh: subjectDID,
    didPkhPrefix: signType
  } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const { issueChallenge, sessionId } = await preIssue({ publicId: ethAddress });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: signType
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress: ethAddress });
  assertSessionDeleted(sessionId);
});

test("should not issue vc because not valid signature", async () => {
  const { address: publicId } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const signType: SignType = "ethereum"
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    payload: {
      publicId: publicId
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `payload response status code is not 200. error: ${challengeResp.body}`
  );
  const {
    sessionId,
    issueChallenge
  } = JSON.parse(challengeResp.body) as EthAccountChallenge;
  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    payload: {
      sessionId: sessionId,
      signature: issueChallenge,
      signType: signType
    }
  });
  a.is(
    errResp.statusCode, 400,
    "error response status code is not 400"
  );
});

test("should issue ethereum account credential with custom property", async () => {
  const {
    address: ethereumAddress,
    didPkh: subjectDID,
    didPkhPrefix: signType
  } = ethereumSupport.info.ethereum;
  const custom = { test: { hello: "world" } };
  const { fastify } = app.context.resolve("httpServer");

  const { issueChallenge, sessionId } = await preIssue({
    publicId: ethereumAddress,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    payload: {
      signature: signature,
      sessionId: sessionId,
      signType: signType
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress });
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  const { custom: vcCustom } = credential.credentialSubject;
  a.ok(vcCustom, "custom is not present");
  a.ok(vcCustom["test"], "custom.test is not present");
  a.ok(vcCustom["test"]?.hello, "custom.test.hello is not present");
  a.is(
    vcCustom["test"]?.hello, "world",
    "hello custom property is not matched"
  );
  assertSessionDeleted(sessionId);
});

test("issue ethereum account credential with different subject and address", async () => {
  const {
    didPkh: subjectDID,
    address: solanaAddress
  } = solanaSupport.info;
  const {
    address: ethereumAddress
  } = ethereumSupport.info.ethereum;
  const { fastify } = app.context.resolve("httpServer");
  const { issueChallenge, sessionId, ownerChallenge } = await preIssue({
    publicId: solanaAddress,
    ethAddress: ethereumAddress,
  });
  const ethSignature = await ethereumSupport.sign(ownerChallenge!);
  const ethSignType: SignType = "ethereum";
  const ownerProofResp = await fastify.inject({
    method: "POST",
    url: ownerProofEP("EthereumAccount"),
    payload: {
      sessionId: sessionId,
      signature: ethSignature,
      signType: ethSignType,
    }
  });
  a.is(ownerProofResp.statusCode, 200,
    `owner proof response status is not matched. body: ${ownerProofResp.body}`);
  const proofResult = JSON.parse(ownerProofResp.body) as EthProofResult;
  a.is(
    proofResult.chainId, "eip155:1",
    `proof result chain id is not matched`
  );
  a.is(
    proofResult.address, ethereumAddress,
    `proof result address is not matched`
  );

  const solanaSignature = await solanaSupport.sign(issueChallenge);
  const solanaSignType: SignType = "solana";
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    payload: {
      signature: solanaSignature,
      sessionId: sessionId,
      signType: solanaSignType
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress });
  assertSessionDeleted(sessionId);
});

test("issue eth account credential with expiration date", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const {
    didPkh: subjectDID,
    address: ethereumAddress,
    didPkhPrefix
  } = ethereumSupport.info.ethereum;
  const expirationDate = new Date();
  const { sessionId, issueChallenge } = await preIssue({
    publicId: ethereumAddress,
    expirationDate:expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    payload: {
      sessionId: sessionId,
      signType: didPkhPrefix,
      signature: signature
    }
  });
  await assertIssueResp({ issueResp, ethereumAddress, subjectDID });
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  a.is(
    credential.expirationDate, expirationDate.toISOString(),
    "credential expiration date is not matched"
  );
  assertSessionDeleted(sessionId);
});

test.run();
