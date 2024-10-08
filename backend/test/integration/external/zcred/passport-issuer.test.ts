import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { testUtil } from "../../../test-util/index.js";
import { FastifyInstance } from "fastify";
import { Config } from "../../../../src/backbone/config.js";
import {
  Challenge,
  ChallengeReq,
  Identifier,
  IEC,
  Info,
  isJsonIssuerException,
  IssueReq,
  StrictId,
  zcredjs
} from "@zcredjs/core";
import * as o1js from "o1js";
import { MinaPoseidonPastaVerifier } from "@zcredjs/mina";
import * as a from "uvu/assert";
import sinon from "sinon";
import { ICredentialSignProver } from "../../../../src/services/credential-provers/type.js";
import { DIDService } from "../../../../src/services/did.service.js";
import { sybil } from "../../../../src/services/sybiljs/index.js";
import { IPassportKYCService } from "../../../../src/issuers/passport/types.js";
import { PassportCredential } from "../../../../src/services/sybiljs/passport/types.js";
import { PassportIssuer } from "../../../../src/issuers/passport/issuer.js";

let application: App;
let fastify: FastifyInstance;
let config: Config;
let passportIssuer: PassportIssuer;
let sessionCache: PassportIssuer["sessionCache"];
let minaPoseidonPastaProver: ICredentialSignProver;
let didService: DIDService;
let passportKYC: IPassportKYCService;

const test = suite("passport credential issuer tests");

test.before(async () => {
  configDotEnv({ path: testUtil.envPath, override: true });
  application = await App.init();
  fastify = application.context.resolve("httpServer").fastify;
  config = application.context.resolve("config");
  // @ts-expect-error
  passportIssuer = application.context.resolve("passportIssuer");
  passportKYC = passportIssuer["passportKYC"];
  sessionCache = passportIssuer["sessionCache"];
  const credentialProver = application.context.resolve("credentialProver");
  minaPoseidonPastaProver = credentialProver["signProvers"]["mina:poseidon-pasta"];
  didService = application.context.resolve("didService");
});

test.after(async () => {
  await application.close();
});

type BeforeIssueParams = {
  subject: {
    id: StrictId;
  },
  validUntil?: string;
  options: {
    chainId: string;
    redirectURL: string;
  }
}

type BeforeIssueResult = {
  sessionId: string;
  message: string;
}

function toProofReference(id: Identifier) {
  return `${id.type}:${id.key}`;
}

async function beforeIssue({
  subject,
  validUntil,
  options
  // @ts-expect-error
}: BeforeIssueParams): BeforeIssueResult {
  // Get challenge
  const kyc_initProcedure_STUB = sinon
    .stub(passportKYC, "initializeProcedure")
    .resolves({ verifyURL: new URL("https://example.com") });
  const challengeReq: ChallengeReq = {
    subject,
    validUntil,
    options
  };
  const challengeResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").challenge,
    body: challengeReq
  });
  kyc_initProcedure_STUB.restore();
  a.is(
    challengeResp.statusCode, 200,
    `challenge response status code is not 200. Resp body: ${JSON.stringify(challengeResp.body)}`
  );
  const challenge = JSON.parse(challengeResp.body) as Challenge;
  const reference = (await sessionCache.get(challenge.sessionId))!.reference;

  // Can issue request before webhook
  const canIssueBeforeResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").canIssue,
    body: { sessionId: challenge.sessionId }
  });
  a.is(
    canIssueBeforeResp.statusCode, 200,
    `Can issue before webhook response status code is not 200. Resp body: ${JSON.stringify(canIssueBeforeResp.body)}`
  );
  a.is(
    JSON.parse(canIssueBeforeResp.body).canIssue, false,
    `Can issue before webhook is true. MUST be false`
  );
  a.is(await sessionCache.get(challenge.sessionId) !== undefined, true);
  const kyc_handleWebhook_STUB = sinon.stub(passportKYC, "handleWebhook").resolves({
    reference: reference,
    verified: true,
    passport: {
      validFrom: new Date(2015, 0, 1).toISOString(),
      validUntil: new Date(2030, 0, 1).toISOString(),
      subject: {
        firstName: "John",
        lastName: "Smith",
        birthDate: new Date(1995, 0, 1).toISOString(),
        gender: "male"
      },
      countryCode: "GBR",
      document: {
        id: "test-passport:123456"
      }
    },
  });
  // @ts-expect-error
  await passportIssuer.handleWebhook({});

  kyc_handleWebhook_STUB.restore();

  const session = await sessionCache.get(challenge.sessionId);
  a.is(
    session?.webhookResp !== undefined, true,
    `session webhook MUST be defined after handling webhook`
  );

  // Can issue after webhook
  const canIssueAfterResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").canIssue,
    body: { sessionId: challenge.sessionId }
  });
  a.is(
    canIssueAfterResp.statusCode, 200,
    `Can issue after webhook status code is not 200. Resp body: ${canIssueAfterResp.body}`
  );
  a.is(
    JSON.parse(canIssueAfterResp.body).canIssue, true,
    `Can issue after webhook result MUST be true`
  );
  return challenge;
}


test("issue passport credential with mina public key", async () => {
  const { sessionId, message } = await beforeIssue({
    subject: {
      id: { type: "mina:publickey", key: testUtil.mina.publicKey }
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet",
      redirectURL: "https://app.zcred.me"
    }
  });
  const signature = await testUtil.mina.signMessage(message, "mina:mainnet");
  const issueReq: IssueReq = {
    sessionId: sessionId,
    signature: signature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. Resp body: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body) as PassportCredential;
  a.is(
    credential.meta.issuer.uri,
    new URL("./issuers/passport", config.pathToExposeDomain).href,
    `Credential meta issuer URI is not match`
  );
  a.is(
    credential.meta.issuer.type,
    "http",
    `Credential meta issuer type is not match`
  );
  const issuerReference = toProofReference(minaPoseidonPastaProver.issuerId);
  a.ok(
    await new MinaPoseidonPastaVerifier(o1js).verify(credential, issuerReference),
    `mina:poseidon-pasta signature proof is not verified`
  );
  a.ok(
    await testUtil.verifyCredJWS(credential),
    `http zk-credential jws is not verified`
  );
});

test("issue passport credential with ethereum public key", async () => {
  const { sessionId, message } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "ethereum:address",
        key: testUtil.ethereum.address.toLowerCase()
      })
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "eip155:1",
      redirectURL: "https://app.zcred.me"
    }
  });
  const signature = await testUtil.ethereum.signMessage(message);
  const issueReq: IssueReq = {
    sessionId,
    signature: signature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. Issue resp: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body) as PassportCredential;
  a.is(
    credential.meta.issuer.uri,
    new URL("./issuers/passport", config.pathToExposeDomain).href,
    `Credential meta issuer URI is not match`
  );
  a.is(
    credential.meta.issuer.type,
    "http",
    `Credential meta issuer type is not match`
  );
  const issuerReference = toProofReference(minaPoseidonPastaProver.issuerId);
  a.ok(
    await new MinaPoseidonPastaVerifier(o1js).verify(credential, issuerReference),
    `mina:poseidon-pasta signature proof is not verified`
  );
  a.ok(
    await testUtil.verifyCredJWS(credential),
    `http zk-credential jws is not verified`
  );
});

test("invalid mina signature", async () => {
  const { sessionId } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "mina:publickey",
        key: testUtil.mina.publicKey
      }),
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet",
      redirectURL: "https://app.zcred.me"
    }
  });
  const issueReq: IssueReq = {
    sessionId,
    signature: ""
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: issueReq
  });
  a.ok(
    issueResp.statusCode === 400,
    `Issue response status code is not 400. Status code ${issueResp.statusCode}`
  );
  const body = JSON.parse(issueResp.body);
  a.ok(isJsonIssuerException(body), `Error response is not issuer exception`);
  a.is(body.code, IEC.ISSUE_BAD_SIGNATURE, `Issuer exception code not matched`);
});

test("invalid ethereum signature", async () => {
  const { sessionId } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "ethereum:address",
        key: testUtil.ethereum.address
      }),
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet",
      redirectURL: "https://app.zcred.me"
    }
  });
  const issueReq: IssueReq = {
    sessionId,
    signature: ""
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: issueReq
  });
  a.ok(
    issueResp.statusCode === 400,
    `Issue response status code is not 400. Status code ${issueResp.statusCode}`
  );
  const body = JSON.parse(issueResp.body);
  a.ok(isJsonIssuerException(body), `Error response is not issuer exception`);
  a.is(body.code, IEC.ISSUE_BAD_SIGNATURE, `Issuer exception code not matched`);
});

test("get issuer info", async () => {
  const infoResp = await fastify.inject({
    method: "GET",
    url: sybil.issuerPath("passport").info
  });
  a.ok(
    infoResp.statusCode === 200,
    `Info status response status code is not 200. Resp body: ${infoResp.body}`
  );
  const info = JSON.parse(infoResp.body) as Info;

  const minaIssuerReference = minaPoseidonPastaProver.issuerReference;
  a.equal(info, {
    protection: {
      jws: { kid: didService.verificationMethod }
    },
    issuer: {
      type: "http",
      uri: info.issuer.uri
    },
    credential: {
      type: "passport",
      attributesPolicy: {
        validUntil: "custom",
        validFrom: "strict"
      }
    },
    definitions: info.definitions,
    proofs: {
      updatable: false,
      updatedAt: info.proofs.updatedAt,
      types: {
        "mina:poseidon-pasta": [minaIssuerReference]
      }
    }
  } as Info);
});

test("sybil id equals for same passport but different subject id", async () => {
  const { sessionId: minaSessionId, message: minaMessage } = await beforeIssue({
    subject: {
      id: { type: "mina:publickey", key: testUtil.mina.publicKey }
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet",
      redirectURL: "https://app.zcred.me"
    }
  });
  const minaSignature = await testUtil.mina.signMessage(minaMessage, "mina:mainnet");
  const minaIssueReq: IssueReq = {
    sessionId: minaSessionId,
    signature: minaSignature
  };
  const minaIssueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: minaIssueReq
  });
  a.is(
    minaIssueResp.statusCode, 200,
    `Issue response status code is not 200. Resp body: ${minaIssueResp.body}`
  );
  const minaCredential = JSON.parse(minaIssueResp.body) as PassportCredential;

  const { sessionId: ethSessionId, message: ethMessage } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "ethereum:address",
        key: testUtil.ethereum.address.toLowerCase()
      })
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "eip155:1",
      redirectURL: "https://app.zcred.me"
    }
  });

  const ethSignature = await testUtil.ethereum.signMessage(ethMessage);
  const issueReq: IssueReq = {
    sessionId: ethSessionId,
    signature: ethSignature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: sybil.issuerPath("passport").issue,
    body: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. Issue resp: ${issueResp.body}`
  );
  const ethCredential = JSON.parse(issueResp.body) as PassportCredential;

  a.is(
    ethCredential.attributes.document.sybilId,
    minaCredential.attributes.document.sybilId,
    `passport sybil ids is not matched`
  );
});

test.run();
