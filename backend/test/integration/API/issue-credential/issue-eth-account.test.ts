import { suite } from "uvu";
import * as a from "uvu/assert";
import { App } from "../../../../src/app/app.js";
import sinon from "sinon";
import { challengeEP, issueEP } from "@sybil-center/sdk/util";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { ethereumSupport } from "../../../support/chain/ethereum.js";
import { EthAccountChallenge, EthAccountProps, EthAccountVC } from "@sybil-center/sdk/types";
import { AnyObj } from "../../../../src/util/model.util.js";
import { LightMyRequestResponse } from "fastify";
import { appSup } from "../../../support/app/index.js";
import { delay } from "../../../../src/util/delay.util.js";

const test = suite("INTEGRATION API: issue Ethereum account credential test");

let app: App;
let apiKey: string;

test.before(async () => {
  const config = new URL("../../../env-config/test.env", import.meta.url);
  configDotEnv({ path: config, override: true });
  app = await App.init();
  const keys = await appSup.apiKeys(app);
  apiKey = keys.apiKey;
});

test.after(async () => {
  sinon.restore();
  await app.close();
});

type PreIssueEntry = {
  subjectId: string;
  custom?: AnyObj,
  expirationDate?: Date,
  props?: EthAccountProps[],
}
const preIssue = async (
  args: PreIssueEntry
): Promise<{
  sessionId: string;
  issueMessage: string;
}> => {
  const fastify = app.context.resolve("httpServer").fastify;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: args.subjectId,
      custom: args.custom,
      expirationDate: args.expirationDate,
      props: args.props
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    "challenge response status code is not 200"
  );
  const { sessionId, issueMessage } = JSON.parse(
    challengeResp.body
  ) as EthAccountChallenge;
  return { sessionId, issueMessage: issueMessage };
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
    "credential subject ethereum sign id is not matched"
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
  const { didPkh: subjectDID, address } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const { issueMessage, sessionId } = await preIssue({ subjectId: subjectDID });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress: address });
  assertSessionDeleted(sessionId);
  const credential = JSON.parse(issueResp.body);
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("should not issue credential because not valid signature", async () => {
  const { didPkh } = ethereumSupport.info.ethereum;
  const fastify = app.context.resolve("httpServer").fastify;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      subjectId: didPkh
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `payload response status code is not 200. error: ${challengeResp.body}`
  );
  const {
    sessionId,
    issueMessage
  } = JSON.parse(challengeResp.body) as EthAccountChallenge;
  const errResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: issueMessage,
    }
  });
  a.is(
    errResp.statusCode, 400,
    "error response status code is not 400"
  );
});

test("should issue ethereum account credential with custom property", async () => {
  const {
    didPkh: subjectDID,
    address: ethAddress,
  } = ethereumSupport.info.ethereum;
  const custom = { test: { hello: "world" } };
  const { fastify } = app.context.resolve("httpServer");

  const { issueMessage, sessionId } = await preIssue({
    subjectId: subjectDID,
    custom: custom
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      signature: signature,
      sessionId: sessionId,
    }
  });
  await assertIssueResp({ issueResp, subjectDID, ethereumAddress: ethAddress });
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
  await appSup.verifyCredential({ credential: credential, app: app });
});

test("issue eth account credential with expiration date", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const {
    didPkh: subjectDID,
    address: ethereumAddress,
  } = ethereumSupport.info.ethereum;
  const expirationDate = new Date();
  const { sessionId, issueMessage } = await preIssue({
    subjectId: subjectDID,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
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
  await appSup.verifyCredential({
    credential: credential,
    app: app,
    shouldVerified: false
  });
});

test("should issue eth credential without props", async () => {
  const fastify = app.context.resolve("httpServer").fastify;
  const { didPkh } = ethereumSupport.info.ethereum;
  const { issueMessage, sessionId } = await preIssue({ subjectId: didPkh, props: [] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    path: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
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
  const { didPkh, address } = ethereumSupport.info.ethereum;
  const { sessionId, issueMessage } = await preIssue({ subjectId: didPkh, props: ["address"] });
  const signature = await ethereumSupport.sign(issueMessage);
  const issueResp = await fastify.inject({
    method: "POST",
    path: issueEP("EthereumAccount"),
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(issueResp.statusCode, 200, `issue reps fail. error: ${issueResp.body}`);
  const credential = JSON.parse(issueResp.body) as EthAccountVC;
  const ethereum = credential.credentialSubject.ethereum;
  a.ok(ethereum, `subject ethereum field is empty`);
  a.is(ethereum.address, address, `ethereum address is not matched`);
  a.not.ok(ethereum.chainId, `subject ethereum.chainId must be empty`);
});

test.run();
