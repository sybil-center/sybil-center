import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../src/app/app.js";
import sinon from "sinon";
import { challengeEP, issueEP } from "@sybil-center/sdk/util";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { ethereumSupport } from "../../test-support/chain/ethereum.js";
import { EthAccountChallenge, EthAccountProps, EthAccountVC, SignType } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../src/util/model.util.js";
import { LightMyRequestResponse } from "fastify";
import { api } from "../../test-support/api/index.js";
import { delay } from "../../../src/util/delay.util.js";

const test = suite("Integration: issue Ethereum account credential");

let app: App;
let apiKey: string;

test.before(async () => {
  const config = new URL("../../test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = new App();
  await app.init();
  const keys = await api.apiKeys(app);
  apiKey = keys.apiKey;
});

test.after(async () => {
  await app.close();
  sinon.restore();
});

type PreIssueEntry = {
  publicId: string;
  custom?: AnyObj,
  expirationDate?: Date,
  props?: EthAccountProps[],
}
const preIssue = async (
  args: PreIssueEntry
): Promise<{
  sessionId: string;
  issueChallenge: string;
}> => {
  const fastify = app.context.resolve("httpServer").fastify;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      publicId: args.publicId,
      custom: args.custom,
      expirationDate: args.expirationDate,
      props: args.props
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    "challenge response status code is not 200"
  );
  const { sessionId, issueChallenge } = JSON.parse(
    challengeResp.body
  ) as EthAccountChallenge;
  return { sessionId, issueChallenge };
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
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: signType
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress: ethAddress });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  await api.verifyCredential(credential, app);
});

test("should not issue credential because not valid signature", async () => {
  const { address: publicId } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const signType: SignType = "ethereum";
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
  //@ts-ignore
  await api.verifyCredential(credential, app);
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
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
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
  await delay(20);
  // @ts-ignore
  await api.verifyCredential(credential, app, false);
});

test("should issue eth credential without props", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { signType, address } = ethereumSupport.info.ethereum;
  const { issueChallenge, sessionId } = await preIssue({ publicId: address, props: [] });
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    path: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: signType
    }
  });
  a.is(issueResp.statusCode, 200, `issue resp fail. error ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  const ethereum = credential.credentialSubject.ethereum;
  a.ok(ethereum, `subject ethereum field is undefined`);
  a.not.ok(ethereum.chainId, `subject ethereum field has to be empty`);
  a.not.ok(ethereum.address, `subject ethereum field has to be empty`);
});

test("should issue eth account credential with only one prop", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const {signType, address} = ethereumSupport.info.ethereum;
  const { sessionId, issueChallenge} = await preIssue({publicId: address, props: ["address"]});
  const signature = await ethereumSupport.sign(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    path: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
      signType: signType
    }
  });
  a.is(issueResp.statusCode, 200, `issue reps fail. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  const ethereum = credential.credentialSubject.ethereum;
  a.ok(ethereum, `subject ethereum field is empty`);
  a.is(ethereum.address, address, `ethereum address is not matched`);
  a.not.ok(ethereum.chainId, `subject ethereum.chainId must be empty`);
})

test.run();
