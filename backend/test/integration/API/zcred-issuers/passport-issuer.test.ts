import { suite } from "uvu";
import { App } from "../../../../src/app/app.js";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import { ShuftiproKYC } from "../../../../src/services/kyc/shuftipro.js";
import { FastifyInstance } from "fastify";
import { Config } from "../../../../src/backbone/config.js";
import { PassportIssuer } from "../../../../src/issuers/zcred/passport/index.js";
import {
  ACIProof,
  Challenge,
  ChallengeReq,
  HttpCredential,
  Identifier,
  Info,
  IssueReq,
  PassportCred,
  zcredjs,
  ZIdentifier
} from "@zcredjs/core";
import * as a from "uvu/assert";
import sinon from "sinon";
import { SHUFTI_PASSPORT_ISSUER_ENDPOINT } from "../../../../src/controllers/kyc/shuftipro/zcred-passport.js";
import { MinaCredentialVerifier } from "@zcredjs/mina";
import { ICredentialSignProver } from "../../../../src/services/credential-prover/type.js";
import { ethereumSupport } from "../../../support/chain/ethereum.js";
import { ethers } from "ethers";
import { minaSupport } from "../../../support/chain/mina.js";
import Client from "mina-signer";
import { Field, Scalar, Signature } from "o1js";
import { DIDService } from "../../../../src/base/service/did.service.js";
import sortKeys from "sort-keys";
import { toJWTPayload } from "../../../../src/util/jwt.util.js";

const test = suite("INTEGRATION API: ZCred passport issuer");

function getWebhookBody(reference: string) {
  return {
    "reference": reference,
    "event": "verification.accepted",
    "country": null,
    "proofs": {
      "document": {
        "proof": "https://ns.shuftipro.com/api/pea/"
      },
      "access_token": "asd",
      "face": {
        "proof": "https://ns.shuftipro.com"
      },
      "verification_video": "https://ns.shuftipro.com/api/pea",
      "verification_report": "https://ns.shuftipro.com/api/pea"
    },
    "verification_data": {
      "document": {
        "expiry_date": null,
        "name": {
          "first_name": "JOHN",
          "middle_name": null,
          "last_name": "TEST"
        },
        "dob": "2000-01-01",
        "issue_date": "2020-06-21",
        "document_number": "DOCUMENTID123123",
        "gender": "M",
        "country": "US",
        "face_match_confidence": 83,
        "selected_type": [
          "passport"
        ],
        "supported_types": [
          "passport"
        ]
      }
    },
    "verification_result": {
      "face": 1,
      "document": {
        "dob": 1,
        "document": 1,
        "document_must_not_be_expired": 1,
        "document_number": 1,
        "document_proof": null,
        "document_visibility": 1,
        "expiry_date": null,
        "face_on_document_matched": 1,
        "gender": 1,
        "issue_date": 1,
        "name": 1,
        "selected_type": 1
      }
    },
    "info": {
      "agent": {
        "is_desktop": true,
        "is_phone": false,
        "useragent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "device_name": "Windows NT 10.0",
        "browser_name": "Chrome 120.0.0.0",
        "platform_name": "Windows 10"
      },
      "geolocation": {
        "host": "95.25.14.69",
        "ip": "95.25.14.69",
        "rdns": "95.25.14.69",
        "asn": "8402",
        "isp": "Pjsc Vimpelcom",
        "country_name": "Russia",
        "country_code": "RU",
        "region_name": "St.-Petersburg",
        "region_code": "SPE",
        "city": "Saint Petersburg",
        "postal_code": "195269",
        "continent_name": "Asia",
        "continent_code": "AS",
        "latitude": "59.939041137695",
        "longitude": "30.315790176392",
        "metro_code": "",
        "timezone": "Europe/Moscow",
        "ip_type": "ipv4",
        "capital": "Moscow",
        "currency": "RUB"
      }
    }
  };
}

let app: App;
let shuptiproKYC: ShuftiproKYC;
let fastify: FastifyInstance;
let config: Config;
let passportIssuer: PassportIssuer;
let sessionCache: PassportIssuer["sessionCache"];
let minaPoseidonPastaProver: ICredentialSignProver;
let didService: DIDService;

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  app = await App.init();
  shuptiproKYC = app.context.resolve("shuftiproKYC");
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
  passportIssuer = app.context.resolve("passportIssuer");
  sessionCache = passportIssuer["sessionCache"];
  const credentialProover = app.context.resolve("credentialProver");
  minaPoseidonPastaProver = credentialProover["signProvers"]["mina:poseidon-pasta"];
  didService = app.context.resolve("didService");
  // await app.run();
});

test.after(async () => {
  await app.close();
});

type BeforeIssueParams = {
  subject: {
    id: ZIdentifier;
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
  let shuftiStub = sinon
    .stub(shuptiproKYC, "getVerifyURL")
    .resolves(new URL("https://example.com"));
  const challengeReq: ChallengeReq = {
    subject,
    validUntil,
    options
  };
  const challengeResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").challenge,
    body: challengeReq
  });
  shuftiStub.restore();
  a.is(
    challengeResp.statusCode, 200,
    `challenge response status code is not 200. Resp body: ${JSON.stringify(challengeResp.body)}`
  );
  const challenge = JSON.parse(challengeResp.body) as Challenge;
  const reference = sessionCache.get(challenge.sessionId).reference;

  // Can issue request before webhook
  const canIssueBeforeResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").canIssue,
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

  // Handle webhook
  // @ts-expect-error
  shuftiStub = sinon.stub(shuptiproKYC, "verifyHttp").returns(true);
  const webhookResult = await fastify.inject({
    method: "POST",
    url: SHUFTI_PASSPORT_ISSUER_ENDPOINT,
    body: getWebhookBody(reference)
  });
  a.is(
    webhookResult.statusCode, 200,
    `Webhook result status code is not 200. Resp body: ${webhookResult.body}`
  );
  a.equal(JSON.parse(webhookResult.body), { message: "ok" });
  shuftiStub.restore();
  const session = sessionCache.find(challenge.sessionId);
  a.is(
    session?.webhookResp !== undefined, true,
    `session webhook MUST be defined after handling webhook`
  );

  // Can issue after webhook
  const canIssueAfterResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").canIssue,
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
    credentialCopy.jws = undefined;
    const jwsPayload = toJWTPayload(credentialCopy);
    const [jwsHeader, _, jwsSignature] = cred.jws.split(".");
    await didService.verifyJWS(`${jwsHeader}.${jwsPayload}.${jwsSignature}`);
    return true;
  } catch (e) {
    return false;
  }
}

test("issue passport credential with mina public key", async () => {
  const { sessionId, message } = await beforeIssue({
    subject: { id: { type: "mina:publickey", key: minaSupport.publicKey } },
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
    url: zcredjs.issuerPath("passport").issue,
    body: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. Resp body: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body) as PassportCred;
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
  a.is(
    await new MinaCredentialVerifier("mina:poseidon-pasta").verify(credential, issuerReference),
    true,
    "mina:poseidon-pasta proof is not verifier"
  );
  a.is(
    await new MinaCredentialVerifier("aci:mina-poseidon").verify(credential, issuerReference),
    true,
    "aci:mina-poseidon proof is not verified"
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
    signature
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").issue,
    body: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. Issue resp: ${issueResp.body}`
  );
  const credential = JSON.parse(issueResp.body) as PassportCred;
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
    await new MinaCredentialVerifier("mina:poseidon-pasta").verify(credential, issuerReference),
    "mina:poseidon-pasta proof is not verifier"
  );
  a.ok(
    await new MinaCredentialVerifier("aci:mina-poseidon").verify(credential, issuerReference),
    "aci:mina-poseidon proof is not verified"
  );
  a.ok(
    await verifyCredJWS(credential),
    `http zk-credential jws is not verified`
  );
});

test("ACI mina-poseidon does not depends on subject id", async () => {
  const minaChallenge = await beforeIssue({
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
  } = minaClient.signMessage(minaChallenge.message, minaSupport.privateKey);
  const minaSignature = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();
  const minaIssueReq: IssueReq = {
    sessionId: minaChallenge.sessionId,
    signature: minaSignature
  };
  const manaIssueResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").issue,
    body: minaIssueReq
  });
  a.is(
    manaIssueResp.statusCode, 200,
    `Issue response status code is not 200. Resp body: ${manaIssueResp.body}`
  );
  const minaCredential = JSON.parse(manaIssueResp.body) as PassportCred;
  const issuerReference = toProofReference(minaPoseidonPastaProver.issuerId);

  const minaACI = (minaCredential.proofs["aci:mina-poseidon"]![issuerReference]! as ACIProof)!.aci;

  const ethereumChallenge = await beforeIssue({
    subject: {
      id: { type: "ethereum:address", key: ethereumSupport.info.ethereum.address.toLowerCase() }
    },
    validUntil: new Date(2030, 1, 1).toISOString(),
    options: {
      chainId: "eip155:1"
    }
  });

  const wallet = new ethers.Wallet(ethereumSupport.info.ethereum.privateKey);
  const ethereumSignature = await wallet.signMessage(ethereumChallenge.message);
  const ethereumIssueReq: IssueReq = {
    sessionId: ethereumChallenge.sessionId,
    signature: ethereumSignature
  };
  const ethereumIssueResp = await fastify.inject({
    method: "POST",
    url: zcredjs.issuerPath("passport").issue,
    body: ethereumIssueReq
  });
  a.is(
    ethereumIssueResp.statusCode, 200,
    `Issue response status code is not 200. Issue resp: ${ethereumIssueResp.body}`
  );
  const ethereumCredential = JSON.parse(ethereumIssueResp.body) as PassportCred;
  const ethereumACI = (ethereumCredential.proofs["aci:mina-poseidon"]![issuerReference]! as ACIProof)!.aci;
  a.ok(minaACI === ethereumACI, `ACI depends on subject id`);
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
    url: zcredjs.issuerPath("passport").issue,
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
    url: zcredjs.issuerPath("passport").issue,
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
    url: zcredjs.issuerPath("passport").info
  });
  a.ok(
    infoResp.statusCode === 200,
    `Info status response status code is not 200. Resp body: ${infoResp.body}`
  );
  const info = JSON.parse(infoResp.body) as Info;

  const minaIssuerReference = minaPoseidonPastaProver.issuerReference;
  a.equal(info, {
    kid: didService.verificationMethod,
    credentialType: "passport",
    updatableProofs: false,
    proofsUpdated: info.proofsUpdated,
    proofsInfo: [
      { type: "mina:poseidon-pasta", references: [minaIssuerReference] },
      { type: "aci:mina-poseidon", references: [minaIssuerReference] }
    ]
  } as Info);
});

test.run();
