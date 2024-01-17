import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { FastifyInstance } from "fastify";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import { PersonaKYC } from "../../../../src/base/service/external/persona-kyc.service.js";
import { PassportTestIssuer } from "../../../../src/issuers/zcred/passport-test/index.js";
import { Challenge, IssueReq, ZChallengeReq, zcredjs } from "@zcredjs/core";
import { minaSupport } from "../../../support/chain/mina.js";
import * as a from "uvu/assert";
import sinon from "sinon";
import { personaWebhookEP } from "../../../../src/base/controller/routes/persona-kyc.route.js";
import Client from "mina-signer";
import { Field, Scalar, Signature } from "o1js";

const test = suite("INTEGRATION API: ZCred passport-test issuer");

let app: App;
let fastify: FastifyInstance;
let personaKYC: PersonaKYC;
let passportTestIssuer: PassportTestIssuer;


test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  passportTestIssuer = app.context.resolve("passportTestIssuer");
  personaKYC = passportTestIssuer["personaKYC"];
  // await app.run();
});


test.after(async () => {
  await app.close();
});


test("issue credential", async () => {
  const reference = "reference";
  const STUB_createReference = sinon.stub(personaKYC, "createReference").returns(reference);
  const STUB_createInquiry = sinon.stub(personaKYC, "createInquiry").resolves({
    verifyURL: "https://example.com",
    inquiryId: "123"
  });
  const STUB_handleWebhook = sinon.stub(personaKYC, "handleWebhook").resolves({
    referenceId: reference,
    user: {
      firstName: "ALEXANDER J",
      lastName: "SAMPLE",
      birthdate: new Date("1977-07-17"),
      countryCode: "US",
      document: {
        id: "I1234562",
        type: "dl"
      }
    },
    completed: true
  });

  const challengeReq: ZChallengeReq = {
    subject: {
      id: {
        type: "mina:publickey",
        key: minaSupport.publicKey
      }
    },
    validUntil: new Date(2030, 0, 0).toISOString(),
    options: { chainId: "mina:mainnet" }
  };
  const challengeResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport-test").challenge,
    body: challengeReq
  });
  STUB_createReference.restore();
  STUB_createInquiry.restore();
  a.ok(
    challengeResp.statusCode === 200,
    `Challenge response status code is not 200. Response body: ${challengeResp.body}`);
  const challenge = JSON.parse(challengeResp.body) as Challenge;

  const canIssueBeforResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport-test").canIssue,
    body: {
      sessionId: challenge.sessionId
    }
  });
  a.ok(
    canIssueBeforResp.statusCode === 200,
    `Can issue before webhook response status code is not 200. Response body: ${canIssueBeforResp.body}`
  );
  a.ok(
    !JSON.parse(canIssueBeforResp.body).canIssue,
    `Can issue before webhook MUST be false`);

  const webhookResp = await fastify.inject({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Persona-Signature": `t=t,v1=v1`
    },
    url: personaWebhookEP,
    body: {
      forTest: "I'm useless"
    }
  });
  a.ok(
    webhookResp.statusCode === 200,
    `Webhook response status code is not 200. Response body: ${webhookResp.body}`);
  STUB_handleWebhook.restore();

  const canIssueAfterResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport-test").canIssue,
    body: {
      sessionId: challenge.sessionId
    }
  });
  a.ok(
    canIssueAfterResp.statusCode === 200,
    `Can issue after webhook status code is not 200. Response body: ${canIssueAfterResp.body}`);
  a.ok(
    JSON.parse(canIssueAfterResp.body).canIssue,
    `Can issue after webhook MUST be true`);

  const minaClient = new Client({ network: "mainnet" });
  const {
    signature: {
      field,
      scalar
    }
  } = minaClient.signMessage(
    challenge.message,
    minaSupport.privateKey);
  const signature = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();

  const issueReq: IssueReq = {
    sessionId: challenge.sessionId,
    signature: signature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport-test").issue,
    body: issueReq
  });
  a.ok(
    issueResp.statusCode === 200,
    `Issue response status code is not 200. Response body: ${issueResp.body}`);

});

test.run();
