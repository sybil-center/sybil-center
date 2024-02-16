import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import { FastifyInstance } from "fastify";
import { Config } from "../../../../src/backbone/config.js";
import { PassportIssuer } from "../../../../src/issuers/zcred/passport/index.js";
import { Challenge, ChallengeReq, HttpCredential, Identifier, Info, IssueReq, StrictId, zcredjs, } from "@zcredjs/core";
import { EthSignature } from "@zcredjs/ethereum";
import * as o1js from "o1js";
import { Field, Scalar, Signature } from "o1js";
import { MinaPoseidonPastaVerifier } from "@zcredjs/mina";
import * as a from "uvu/assert";
import sinon from "sinon";
import { ICredentialSignProver } from "../../../../src/services/credential-provers/type.js";
import { ethereumSupport } from "../../../support/chain/ethereum.js";
import { ethers } from "ethers";
import { minaSupport } from "../../../support/chain/mina.js";
import Client from "mina-signer";
import { DIDService } from "../../../../src/base/service/did.service.js";
import sortKeys from "sort-keys";
import { toJWTPayload } from "../../../../src/util/jwt.util.js";
import { sybil } from "../../../../src/services/sybiljs/index.js";
import { IPassportKYCService } from "../../../../src/issuers/zcred/passport/types.js";
import { PassportCredential } from "../../../../src/services/sybiljs/passport/types.js";

const test = suite("INTEGRATION API: ZCred passport issuer");

let app: App;
let fastify: FastifyInstance;
let config: Config;
let passportIssuer: PassportIssuer;
let sessionCache: PassportIssuer["sessionCache"];
let minaPoseidonPastaProver: ICredentialSignProver;
let didService: DIDService;
let passportKYC: IPassportKYCService;

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
  passportIssuer = app.context.resolve("passportIssuer");
  passportKYC = passportIssuer["passportKYC"];
  sessionCache = passportIssuer["sessionCache"];
  const credentialProver = app.context.resolve("credentialProver");
  minaPoseidonPastaProver = credentialProver["signProvers"]["mina:poseidon-pasta"];
  didService = app.context.resolve("didService");
  await app.run();
});

test.after(async () => {
  await app.close();
});

type BeforeIssueParams = {
  subject: {
    id: StrictId;
  },
  validUntil?: string;
  options: {
    chainId: string;
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
  const reference = sessionCache.get(challenge.sessionId).reference;

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
  a.is(sessionCache.find(challenge.sessionId) !== undefined, true);
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

  const session = sessionCache.find(challenge.sessionId);
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

async function verifyCredJWS(cred: HttpCredential): Promise<boolean> {
  try {
    const credentialCopy = sortKeys(JSON.parse(JSON.stringify(cred)), { deep: true });
    credentialCopy.protection = undefined;
    const jwsPayload = toJWTPayload(credentialCopy);
    const [jwsHeader, _, jwsSignature] = cred.protection.jws.split(".");
    await didService.verifyJWS(`${jwsHeader}.${jwsPayload}.${jwsSignature}`);
    return true;
  } catch (e) {
    return false;
  }
}

test("issue passport credential with mina public key", async () => {
  const { sessionId, message } = await beforeIssue({
    subject: {
      id: { type: "mina:publickey", key: minaSupport.publicKey }
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet"
    }
  });
  const minaClient = new Client({ network: "mainnet" });
  const {
    signature: {
      field,
      scalar
    }
  } = minaClient.signMessage(message, minaSupport.privateKey);
  const signature = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();
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
    new URL("./api/v1/zcred/issuers/passport", config.pathToExposeDomain).href,
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
    await verifyCredJWS(credential),
    `http zk-credential jws is not verified`
  );
});

test("issue passport credential with ethereum public key", async () => {
  const { sessionId, message } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "ethereum:address",
        key: ethereumSupport.info.ethereum.address.toLowerCase()
      })
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "eip155:1"
    }
  });

  const wallet = new ethers.Wallet(ethereumSupport.info.ethereum.privateKey);
  const signature = await wallet.signMessage(message);
  const issueReq: IssueReq = {
    sessionId,
    signature: EthSignature.toBase58(signature)
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
    new URL("./api/v1/zcred/issuers/passport", config.pathToExposeDomain).href,
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
    await verifyCredJWS(credential),
    `http zk-credential jws is not verified`
  );
});

test("invalid mina signature", async () => {
  const { sessionId } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "mina:publickey",
        key: minaSupport.publicKey
      }),
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet"
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
    issueResp.statusCode !== 200,
    `Issue response status code is not 200. Status code ${issueResp.statusCode}`
  );
});

test("invalid ethereum signature", async () => {
  const { sessionId } = await beforeIssue({
    subject: {
      id: zcredjs.normalizeId({
        type: "ethereum:address",
        key: ethereumSupport.info.ethereum.address
      }),
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet"
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
    issueResp.statusCode !== 200,
    `Issue response status code is not 200. Status code ${issueResp.statusCode}`
  );
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
      id: { type: "mina:publickey", key: minaSupport.publicKey }
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "mina:mainnet"
    }
  });
  const minaClient = new Client({ network: "mainnet" });
  const {
    signature: {
      field,
      scalar
    }
  } = minaClient.signMessage(minaMessage, minaSupport.privateKey);
  const minaSignature = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();
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
        key: ethereumSupport.info.ethereum.address.toLowerCase()
      })
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "eip155:1"
    }
  });

  const wallet = new ethers.Wallet(ethereumSupport.info.ethereum.privateKey);
  const ethSignature = await wallet.signMessage(ethMessage);
  const issueReq: IssueReq = {
    sessionId: ethSessionId,
    signature: EthSignature.toBase58(ethSignature)
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
