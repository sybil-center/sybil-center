import { suite } from "uvu";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import { App } from "../../../../src/app/app.js";
import { minaSupport } from "../../../support/chain/mina.js";
import { PersonaKYC } from "../../../../src/base/service/external/persona-kyc.service.js";
import sinon from "sinon";
import { rest } from "../../../../src/util/fetch.util.js";
import { FastifyInstance } from "fastify";
import { zkc } from "../../../../src/util/zk-credentials.util.js";
import * as a from "uvu/assert";
import { ZkcCanIssueResp, ZkcChallengeReq, ZkcIssueReq } from "../../../../src/base/types/zkc.issuer.js";
import { PassportChallenge, ZkcPassportIssuer } from "../../../../src/issuers/zkc/passport/issuer.js";
import { Config } from "../../../../src/backbone/config.js";
import crypto from "node:crypto";
import { personaWebhookEP } from "../../../../src/base/controller/routes/persona-kyc.route.js";
import Client from "mina-signer";
import { Field, Poseidon, PrivateKey, PublicKey, Scalar, Signature } from "snarkyjs";
import { ZkCredProved } from "../../../../src/base/types/zkc.credential.js";

const test = suite("INTEGRATION API: Passport ZKC issuer");

let app: App;
let personaKYC: PersonaKYC;
let fastify: FastifyInstance;
let config: Config;
let sessionCache: ZkcPassportIssuer["sessionCache"];

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  app = await App.init();
  // @ts-ignore
  personaKYC = app.context.resolve("zkcPassportIssuer").personaKYC as PersonaKYC;
  // @ts-ignore
  sessionCache = app.context.resolve("zkcPassportIssuer").sessionCache as ZkcPassportIssuer["sessionCache"];
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
});

test.after(async () => {
  await app.close();
});

test("Issue Passport ZK Credential for MINA ", async () => {
  const publicKey = minaSupport.publicKey;
  const refId = personaKYC.refId({ t: 0, k: publicKey });
  const inqId = "inq_ZEbFxoGdE4s8UdFUEBurhy63";
  const inqCreateResp = {
    "data": {
      "type": "inquiry",
      "id": inqId,
      "attributes": {
        "status": "created",
        "reference-id": refId,
        "note": null,
        "behaviors": {
          "request-spoof-attempts": null,
          "user-agent-spoof-attempts": null,
          "distraction-events": null,
          "hesitation-baseline": null,
          "hesitation-count": null,
          "hesitation-time": null,
          "shortcut-copies": null,
          "shortcut-pastes": null,
          "autofill-cancels": null,
          "autofill-starts": null,
          "devtools-open": null,
          "completion-time": null,
          "hesitation-percentage": null,
          "behavior-threat-level": null
        },
        "tags": [],
        "creator": "API",
        "reviewer-comment": null,
        "created-at": "2023-09-21T09:27:15.000Z",
        "started-at": null,
        "completed-at": null,
        "failed-at": null,
        "marked-for-review-at": null,
        "decisioned-at": null,
        "expired-at": null,
        "redacted-at": null,
        "previous-step-name": null,
        "next-step-name": "start",
        "name-first": "Ash",
        "name-middle": null,
        "name-last": "Ketchum",
        "birthdate": null,
        "address-street-1": null,
        "address-street-2": null,
        "address-city": null,
        "address-subdivision": null,
        "address-subdivision-abbr": null,
        "address-postal-code": null,
        "address-postal-code-abbr": null,
        "social-security-number": null,
        "identification-number": null,
        "email-address": null,
        "phone-number": null,
        "fields": {
          "name-first": {
            "type": "string",
            "value": "Ash"
          },
          "name-middle": {
            "type": "string",
            "value": null
          },
          "name-last": {
            "type": "string",
            "value": "Ketchum"
          },
          "address-street-1": {
            "type": "string",
            "value": null
          },
          "address-street-2": {
            "type": "string",
            "value": null
          },
          "address-city": {
            "type": "string",
            "value": null
          },
          "address-subdivision": {
            "type": "string",
            "value": null
          },
          "address-postal-code": {
            "type": "string",
            "value": null
          },
          "address-country-code": {
            "type": "string",
            "value": null
          },
          "birthdate": {
            "type": "date",
            "value": null
          },
          "email-address": {
            "type": "string",
            "value": null
          },
          "phone-number": {
            "type": "string",
            "value": null
          },
          "identification-number": {
            "type": "string",
            "value": null
          },
          "identification-class": {
            "type": "string",
            "value": null
          },
          "selected-country-code": {
            "type": "string",
            "value": "US"
          },
          "current-selfie": {
            "type": "selfie",
            "value": null
          },
          "selected-id-class": {
            "type": "string",
            "value": null
          },
          "current-government-id": {
            "type": "government_id",
            "value": null
          }
        }
      },
      "relationships": {
        "account": {
          "data": {
            "type": "account",
            "id": "act_Lo7QxorAfD71skdckr7tWgQ1"
          }
        },
        "template": {
          "data": null
        },
        "inquiry-template": {
          "data": {
            "type": "inquiry-template",
            "id": "itmpl_gymYN49rWeGu8BHk1c5A5Xun"
          }
        },
        "inquiry-template-version": {
          "data": {
            "type": "inquiry-template-version",
            "id": "itmplv_SAKWu7A6EHJGhiaGRHfgkSZF"
          }
        },
        "reviewer": {
          "data": null
        },
        "reports": {
          "data": []
        },
        "verifications": {
          "data": []
        },
        "sessions": {
          "data": []
        },
        "documents": {
          "data": []
        },
        "selfies": {
          "data": []
        }
      }
    }
  };
  sinon.stub(rest, "fetchJson").resolves(inqCreateResp);
  const challengeReq: ZkcChallengeReq = {
    sbjId: {
      t: "0",
      k: minaSupport.publicKey
    },
  };
  const challengeResp = await fastify.inject({
    method: "POST",
    url: zkc.EPs.v1("Passport").challenge,
    payload: challengeReq
  });
  a.is(
    challengeResp.statusCode, 200,
    `Challenge resp status code is not 200. error: ${challengeResp.body}`
  );
  const challenge: PassportChallenge = JSON.parse(challengeResp.body);
  a.ok(challenge.message, "Challenge message is undefined");
  a.is(
    challenge.verifyURL, `https://withpersona.com/verify?inquiry-id=${inqId}`,
    "Challenge verify URL is not matched"
  );
  a.is(challenge.sessionId, refId, "Challenge session id is not reference id");

  const canIssueBeforeResp = await fastify.inject({
    method: "GET",
    url: zkc.EPs.v1("Passport").canIssue,
    query: { sessionId: refId }
  });
  a.is(
    canIssueBeforeResp.statusCode, 200,
    `Can issue before resp status code is not 200. error: ${canIssueBeforeResp.body}`
  );
  const canBefore: ZkcCanIssueResp = JSON.parse(canIssueBeforeResp.body);
  a.is(canBefore.canIssue, false, `Can issue resp must be false until webhook`);

  sinon.stub(personaKYC, "handleWebhook").resolves({
    referenceId: refId,
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
  const webhookBody = JSON.stringify(JSON.parse("{\"data\":{\"type\":\"event\",\"id\":\"evt_1cjFCcKjk7vWmBeVEW3GtfF1\",\"attributes\":{\"name\":\"inquiry.completed\",\"payload\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\",\"attributes\":{\"status\":\"completed\",\"reference-id\":\"" + refId + "\",\"note\":null,\"behaviors\":{\"request-spoof-attempts\":0,\"user-agent-spoof-attempts\":0,\"distraction-events\":1,\"hesitation-baseline\":17892,\"hesitation-count\":6,\"hesitation-time\":11457,\"shortcut-copies\":0,\"shortcut-pastes\":0,\"autofill-cancels\":9,\"autofill-starts\":0,\"devtools-open\":false,\"completion-time\":38.727826204,\"hesitation-percentage\":64.03420523138833,\"behavior-threat-level\":\"low\"},\"tags\":[],\"creator\":\"pavelpal.d@gmail.com\",\"reviewer-comment\":null,\"created-at\":\"2023-09-22T11:10:34.000Z\",\"started-at\":\"2023-09-22T11:10:59.000Z\",\"completed-at\":\"2023-09-22T11:11:17.000Z\",\"failed-at\":null,\"marked-for-review-at\":null,\"decisioned-at\":null,\"expired-at\":null,\"redacted-at\":null,\"previous-step-name\":\"verification_selfie\",\"next-step-name\":\"success\",\"name-first\":\"ALEXANDER J\",\"name-middle\":null,\"name-last\":\"SAMPLE\",\"birthdate\":\"1977-07-17\",\"address-street-1\":\"600 CALIFORNIA STREET\",\"address-street-2\":null,\"address-city\":\"SAN FRANCISCO\",\"address-subdivision\":\"California\",\"address-subdivision-abbr\":\"CA\",\"address-postal-code\":\"941090000\",\"address-postal-code-abbr\":\"94109\",\"social-security-number\":null,\"identification-number\":\"I1234562\",\"email-address\":null,\"phone-number\":null,\"fields\":{\"name-first\":{\"type\":\"string\",\"value\":\"ALEXANDER J\"},\"name-middle\":{\"type\":\"string\",\"value\":null},\"name-last\":{\"type\":\"string\",\"value\":\"SAMPLE\"},\"address-street-1\":{\"type\":\"string\",\"value\":\"600 CALIFORNIA STREET\"},\"address-street-2\":{\"type\":\"string\",\"value\":null},\"address-city\":{\"type\":\"string\",\"value\":\"SAN FRANCISCO\"},\"address-subdivision\":{\"type\":\"string\",\"value\":\"CA\"},\"address-postal-code\":{\"type\":\"string\",\"value\":\"94109\"},\"address-country-code\":{\"type\":\"string\",\"value\":\"US\"},\"birthdate\":{\"type\":\"date\",\"value\":\"1977-07-17\"},\"email-address\":{\"type\":\"string\",\"value\":null},\"phone-number\":{\"type\":\"string\",\"value\":null},\"identification-number\":{\"type\":\"string\",\"value\":\"I1234562\"},\"identification-class\":{\"type\":\"string\",\"value\":\"dl\"},\"selected-country-code\":{\"type\":\"string\",\"value\":\"US\"},\"current-selfie\":{\"type\":\"selfie\",\"value\":{\"id\":\"self_YLC5N27eGcMBHAb52yTDWG3q\",\"type\":\"Selfie::ProfileAndCenter\"}},\"selected-id-class\":{\"type\":\"string\",\"value\":\"pp\"},\"current-government-id\":{\"type\":\"government_id\",\"value\":{\"id\":\"doc_XjBsPH3ZBF2P3ppnoCLUaRLu\",\"type\":\"Document::GovernmentId\"}}}},\"relationships\":{\"account\":{\"data\":{\"type\":\"account\",\"id\":\"act_YJY5bH87dn7qD17JsiF4T9Xy\"}},\"template\":{\"data\":null},\"inquiry-template\":{\"data\":{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\"}},\"inquiry-template-version\":{\"data\":{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\"}},\"reviewer\":{\"data\":null},\"reports\":{\"data\":[]},\"verifications\":{\"data\":[{\"type\":\"verification/government-id\",\"id\":\"ver_vemf32qyojy3XwXNe2QhRPiL\"},{\"type\":\"verification/selfie\",\"id\":\"ver_nLXrE4WfF1wo7KLGVAWrxZrh\"}]},\"sessions\":{\"data\":[{\"type\":\"inquiry-session\",\"id\":\"iqse_vmwujCbnPDKkyktE6LMBF5UQ\"}]},\"documents\":{\"data\":[{\"type\":\"document/government-id\",\"id\":\"doc_XjBsPH3ZBF2P3ppnoCLUaRLu\"}]},\"selfies\":{\"data\":[{\"type\":\"selfie/profile-and-center\",\"id\":\"self_YLC5N27eGcMBHAb52yTDWG3q\"}]}}},\"included\":[{\"type\":\"account\",\"id\":\"act_YJY5bH87dn7qD17JsiF4T9Xy\",\"attributes\":{\"reference-id\":\"" + refId + "\",\"created-at\":\"2023-09-22T11:10:34.000Z\",\"updated-at\":\"2023-09-22T11:11:18.000Z\",\"redacted-at\":null,\"fields\":{\"name\":{\"type\":\"hash\",\"value\":{\"first\":{\"type\":\"string\",\"value\":\"ALEXANDER J\"},\"middle\":{\"type\":\"string\",\"value\":null},\"last\":{\"type\":\"string\",\"value\":\"SAMPLE\"}}},\"address\":{\"type\":\"hash\",\"value\":{\"street_1\":{\"type\":\"string\",\"value\":\"600 CALIFORNIA STREET\"},\"street_2\":{\"type\":\"string\",\"value\":null},\"subdivision\":{\"type\":\"string\",\"value\":\"CA\"},\"city\":{\"type\":\"string\",\"value\":\"SAN FRANCISCO\"},\"postal_code\":{\"type\":\"string\",\"value\":\"94109\"},\"country_code\":{\"type\":\"string\",\"value\":\"US\"}}},\"identification_numbers\":{\"type\":\"array\",\"value\":[{\"type\":\"hash\",\"value\":{\"identification_class\":{\"type\":\"string\",\"value\":\"dl\"},\"identification_number\":{\"type\":\"string\",\"value\":\"I1234562\"},\"issuing_country\":{\"type\":\"string\",\"value\":\"US\"}}}]},\"birthdate\":{\"type\":\"date\",\"value\":\"1977-07-17\"},\"phone_number\":{\"type\":\"string\",\"value\":null},\"email_address\":{\"type\":\"string\",\"value\":null},\"selfie_photo\":{\"type\":\"file\",\"value\":{\"filename\":\"center_photo_processed.jpg\",\"byte_size\":148356,\"url\":\"https://files.withpersona.com/center_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJxcDRqOGdqd3lxdzg2bzBuaWoya3Q5bzJ6dGtrIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImQwNWFiZmI4LWNiNjItNDQxOS1iMmYwLTExMGVkM2FiMjMxZSIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJhY2NvdW50cyIsImZpbGVfaW5mbyI6InNlbGZpZV9waG90byIsImV4cCI6MTY5NTQwMjY3OX0.VtdDeTFrw7zZIDAn9moo9XgdjjZj_aPGtTkLdV0M2XM\"}}},\"name-first\":\"ALEXANDER J\",\"name-middle\":null,\"name-last\":\"SAMPLE\",\"phone-number\":null,\"email-address\":null,\"address-street-1\":\"600 CALIFORNIA STREET\",\"address-street-2\":null,\"address-city\":\"SAN FRANCISCO\",\"address-subdivision\":\"CA\",\"address-postal-code\":\"94109\",\"country-code\":\"US\",\"birthdate\":\"1977-07-17\",\"social-security-number\":null,\"tags\":[],\"identification-numbers\":{\"dl\":[{\"issuing-country\":\"US\",\"identification-class\":\"dl\",\"identification-number\":\"I1234562\",\"created-at\":\"2023-09-22T11:11:00.218Z\",\"updated-at\":\"2023-09-22T11:11:00.218Z\"}]}}},{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\",\"attributes\":{\"status\":\"active\",\"name\":\"Government ID and Form and Selfie\"},\"relationships\":{\"latest-published-version\":{\"data\":{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\"}}}},{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\",\"attributes\":{\"name-display\":null,\"status\":\"published\",\"enabled-locales\":[\"ar-EG\",\"bn\",\"cy\",\"de\",\"en-US\",\"es-MX\",\"fr\",\"he\",\"hi\",\"hu\",\"id-ID\",\"it\",\"ja\",\"ko-KR\",\"lt\",\"ms\",\"nl-NL\",\"pl\",\"pt-BR\",\"ro\",\"ru\",\"sv\",\"ta\",\"th\",\"tr-TR\",\"uk-UA\",\"vi\",\"zh-CN\",\"zh-TW\"],\"created-at\":\"2023-09-20T16:57:23.307Z\",\"updated-at\":\"2023-09-20T17:23:43.059Z\",\"published-at\":\"2023-09-20T17:23:41.000Z\",\"theme\":{\"border-radius\":null,\"border-radius-modal\":null,\"border-width\":null,\"button-background-image\":null,\"button-font-weight\":null,\"button-position\":null,\"button-shadow-strength\":null,\"button-text-transform\":null,\"color-button-primary\":null,\"color-button-secondary\":null,\"color-button-secondary-fill\":null,\"color-button-primary-fill-disabled\":null,\"color-button-secondary-fill-disabled\":null,\"color-error\":null,\"color-font\":null,\"color-font-button-primary\":null,\"color-font-button-secondary\":null,\"color-font-small\":null,\"color-font-title\":null,\"color-icon-header\":null,\"color-input-background\":null,\"color-input-border\":null,\"color-link\":null,\"color-modal-background\":null,\"color-primary\":null,\"color-progress-bar\":null,\"color-success\":null,\"color-warning\":null,\"color-divider\":null,\"color-dropdown-background\":null,\"color-dropdown-option\":null,\"font-family\":null,\"font-family-title\":null,\"font-url\":null,\"font-size-body\":null,\"font-size-header\":null,\"font-size-small\":null,\"line-height-body\":null,\"line-height-header\":null,\"line-height-small\":null,\"header-font-weight\":null,\"header-margin-bottom\":null,\"icon-color-primary\":null,\"icon-color-highlight\":null,\"icon-color-stroke\":null,\"icon-color-background\":null,\"icon-color-government-id-type\":null,\"icon-style\":null,\"input-style\":null,\"page-transition\":null,\"text-align\":null,\"text-decoration-line-link\":null,\"us-state-input-method\":null,\"vertical-options-style\":null,\"government-id-pictograph-position\":null,\"id-back-pictograph-height\":null,\"id-back-pictograph-url\":null,\"id-front-pictograph-height\":null,\"id-front-pictograph-url\":null,\"passport-front-pictograph-height\":null,\"passport-front-pictograph-url\":null,\"passport-signature-pictograph-height\":null,\"passport-signature-pictograph-url\":null,\"government-id-select-pictograph-height\":null,\"government-id-select-pictograph-url\":null,\"device-handoff-terms-text-position\":null,\"selfie-pictograph-url\":null,\"selfie-pictograph-height\":null,\"selfie-terms-text-position\":null,\"selfie-center-pictograph-url\":null,\"selfie-center-pictograph-height\":null,\"selfie-left-pictograph-url\":null,\"selfie-left-pictograph-height\":null,\"selfie-right-pictograph-url\":null,\"selfie-right-pictograph-height\":null,\"document-pictograph-position\":null,\"document-pictograph-height\":null,\"document-pictograph-url\":null,\"camera-support-pictograph-height\":null,\"camera-support-pictograph-url\":null,\"loading-pictograph-height\":null,\"loading-pictograph-url\":null,\"navbar-logo-display\":null,\"logo-url\":null,\"logo\":null,\"logo-data\":null,\"logo-filename\":null}},\"relationships\":{\"inquiry-template\":{\"data\":{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\"}}}},{\"type\":\"verification/government-id\",\"id\":\"ver_vemf32qyojy3XwXNe2QhRPiL\",\"attributes\":{\"status\":\"passed\",\"created-at\":\"2023-09-22T11:10:56.000Z\",\"created-at-ts\":1695381056,\"submitted-at\":\"2023-09-22T11:10:56.000Z\",\"submitted-at-ts\":1695381056,\"completed-at\":\"2023-09-22T11:10:58.000Z\",\"completed-at-ts\":1695381058,\"country-code\":\"US\",\"entity-confidence-score\":100.0,\"entity-confidence-reasons\":[\"generic\"],\"front-photo-url\":\"https://files.withpersona.com/photo1.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiY3htYzdjMXR3OHJlZGk5NGE5emV0dTZ4Njk4IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImQ5ZDc3YmE5LTNjYjgtNGMwMi1iY2JkLTMyNWE3NWYzMTI5YiIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoicHJvY2Vzc2VkIiwiZXhwIjoxNjk1NDAyNjc5fQ.fYPtbB90p2BIouZNiPbInZ87pq3xlN9QKP4nSkGENCQ\",\"back-photo-url\":null,\"photo-urls\":[{\"page\":\"front\",\"url\":\"https://files.withpersona.com/photo1.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiY3htYzdjMXR3OHJlZGk5NGE5emV0dTZ4Njk4IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6Ijg1MTNmNGRkLTQ4NTYtNDBkYy04Njg4LTg5MGQ3NWY3OGE2NCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoicHJvY2Vzc2VkIiwiZXhwIjoxNjk1NDAyNjc5fQ.eLVnom1EwoOiseAFktpLzVIhL60DPSoHYKqLeBcJ_rw\",\"normalized-url\":\"https://files.withpersona.com/photo1.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4eWZ3aWh0NmNrbHphdGMyZjF3NDFyYjJta2F3IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImM1MjUwYmJhLTZmZTktNDMzNS1hNDBlLTYyZGFmMWY1Y2Y3MCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoibm9ybWFsaXplZCIsImV4cCI6MTY5NTQwMjY3OX0.ecapO02RPmsx9qjfgMETrPR5iajEIgersvpaYh04ZPI\",\"original-urls\":[\"https://files.withpersona.com/photo1.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5c3lkazhqd3NtYWU0eWhoMTlyeWF1c3RocXI5IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6IjY1MTUwOTY5LWEyYzItNGQ4OC04OGI5LTVjNjI2MTdkNjQwZCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoib3JpZ2luYWxzIiwiZXhwIjoxNjk1NDAyNjc5fQ.AurE325UERZPh0bkCELnBcUEaVVy-ThjB4TAeRfH1cA\"],\"byte-size\":309608}],\"selfie-photo\":{\"url\":\"https://files.withpersona.com/selfie_photo.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnZzExbXBqMjAyOHRwbHR3Y3VhbTVtdnhwc3MzIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImQ3NGI0NzJlLTJjZjYtNDAwZC1iZjE2LTEyMjljNTNhMTUxOSIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoic2VsZmllX3Bob3RvIiwiZXhwIjoxNjk1NDAyNjc5fQ.JwYwpW7B2B-Gg1OZXlhelJSObequNdV9JlLNSfKSprY\",\"byte-size\":309608},\"selfie-photo-url\":\"https://files.withpersona.com/selfie_photo.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnZzExbXBqMjAyOHRwbHR3Y3VhbTVtdnhwc3MzIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImYyMWYzMTNiLWQzNzgtNGY0ZS05NWRiLTVlZjNlMTQyNDliZiIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoic2VsZmllX3Bob3RvIiwiZXhwIjoxNjk1NDAyNjc5fQ.0rJBWVAPViYolK_JO3PDSBzpWeHfeOIFAPPs-MnoGK0\",\"video-url\":null,\"id-class\":\"dl\",\"capture-method\":\"manual\",\"name-first\":\"ALEXANDER J\",\"name-middle\":null,\"name-last\":\"SAMPLE\",\"name-suffix\":null,\"birthdate\":\"1977-07-17\",\"address-street-1\":\"600 CALIFORNIA STREET\",\"address-street-2\":null,\"address-city\":\"SAN FRANCISCO\",\"address-subdivision\":\"CA\",\"address-postal-code\":\"94109\",\"issuing-authority\":\"CA\",\"issuing-subdivision\":\"CA\",\"nationality\":null,\"document-number\":null,\"visa-status\":null,\"issue-date\":\"2022-09-22\",\"expiration-date\":\"2028-09-22\",\"designations\":null,\"birthplace\":null,\"endorsements\":null,\"height\":null,\"sex\":\"Male\",\"restrictions\":null,\"vehicle-class\":null,\"identification-number\":\"I1234562\",\"checks\":[{\"name\":\"id_aamva_database_lookup\",\"status\":\"not_applicable\",\"reasons\":[\"disabled_by_check_config\"],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_account_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_age_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_age_inconsistency_detection\",\"status\":\"not_applicable\",\"reasons\":[\"disabled_by_check_config\"],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_barcode_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_barcode_inconsistency_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_blur_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_color_inconsistency_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_compromised_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_disallowed_country_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{\"country-code\":null,\"selected-country-code\":null}},{\"name\":\"id_disallowed_type_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{\"country-code\":null,\"detected-id-class\":null,\"detected-id-designations\":null,\"disallowed-id-designations\":null,\"selected-id-classes\":null}},{\"name\":\"id_double_side_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_electronic_replica_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_entity_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_expired_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_extracted_properties_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_extraction_inconsistency_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{\"check-requirements\":[]}},{\"name\":\"id_fabrication_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_glare_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_handwriting_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_inconsistent_repeat_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_inquiry_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_mrz_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_mrz_inconsistency_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_number_format_inconsistency_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_po_box_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_portrait_clarity_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_portrait_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_public_figure_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_real_id_detection\",\"status\":\"not_applicable\",\"reasons\":[\"disabled_by_check_config\"],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_repeat_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_selfie_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"id_tamper_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_unprocessable_submission_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"id_valid_dates_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}}]},\"relationships\":{\"inquiry\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\"}},\"template\":{\"data\":null},\"inquiry-template-version\":{\"data\":{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\"}},\"inquiry-template\":{\"data\":{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\"}},\"verification-template\":{\"data\":{\"type\":\"verification-template/government-id\",\"id\":\"vtmpl_u6fpYojaXP3FqZVqvsaLuVZZ\"}},\"verification-template-version\":{\"data\":{\"type\":\"verification-template-version/government-id\",\"id\":\"vtmplv_2uApQwi4LPohgKhDEUKUN9wU\"}},\"document\":{\"data\":{\"type\":\"document/government-id\",\"id\":\"doc_XjBsPH3ZBF2P3ppnoCLUaRLu\"}}}},{\"type\":\"verification/selfie\",\"id\":\"ver_nLXrE4WfF1wo7KLGVAWrxZrh\",\"attributes\":{\"status\":\"passed\",\"created-at\":\"2023-09-22T11:11:15.000Z\",\"created-at-ts\":1695381075,\"submitted-at\":\"2023-09-22T11:11:15.000Z\",\"submitted-at-ts\":1695381075,\"completed-at\":\"2023-09-22T11:11:17.000Z\",\"completed-at-ts\":1695381077,\"country-code\":null,\"left-photo-url\":\"https://files.withpersona.com/left_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0bmxmOWFhNDI2eGQ2eGFxNXBsMWlzOGR1eXZyIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6ImVlMzA4NTkxLTM5OGUtNDFmZC1hYTM5LWQwZTk3ZGFkY2RhZCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2Nzl9.hal-WbvTiWRHmCUsgC3jQ7I17FymWVoHUJdMJof5vac\",\"center-photo-url\":\"https://files.withpersona.com/center_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrNjJ6bTFsdDZ5cmlxaHd4OTZkNDNyaTJyaHhqIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6IjBkZDc5MjExLThmNTctNGY3Ni1iNzhmLWE4ZDBjZjZmYjNhOSIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2Nzl9.eYnAyM4idyv_paQNeNaL-15iJWcpYdMyRi1czbj5enc\",\"right-photo-url\":\"https://files.withpersona.com/right_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwYzBhYXh4M3g1NXNwdzdza2JwbXFzOGNqazg3IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6IjZlM2Y2OGNkLTZjMzctNDc5Zi1iMjZmLTNkYjJlOTVhMDIyZSIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2Nzl9.Z5NyTFcWM5OZHAYtrByXebS5dS868PNEzC2v96q130g\",\"photo-urls\":[{\"page\":\"left_photo\",\"url\":\"https://files.withpersona.com/left_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0bmxmOWFhNDI2eGQ2eGFxNXBsMWlzOGR1eXZyIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDc5LCJuYmYiOjE2OTUzODEwNzksImp0aSI6IjI2NzM2OGZlLTFkNzAtNDUyZS04YWViLTBjY2JiZTdkZTQ2OCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2Nzl9.zIHitaReusa3BHNRTxehDdLs6qyR2t6JhOiK9csxOKo\",\"byte-size\":147650},{\"page\":\"center_photo\",\"url\":\"https://files.withpersona.com/center_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrNjJ6bTFsdDZ5cmlxaHd4OTZkNDNyaTJyaHhqIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDgwLCJuYmYiOjE2OTUzODEwODAsImp0aSI6ImY0MzhmMTVlLTU2MjAtNDM3OC05Y2ZkLTM3MzZkZDk3ODViZSIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2ODB9.wmod7ceAnJLUAgCUvl0zwlB6LYMpFRmpgnSbDSW0-S8\",\"byte-size\":148356},{\"page\":\"right_photo\",\"url\":\"https://files.withpersona.com/right_photo_processed.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwYzBhYXh4M3g1NXNwdzdza2JwbXFzOGNqazg3IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDgwLCJuYmYiOjE2OTUzODEwODAsImp0aSI6ImU1NzViN2I4LTc1NTAtNGFjZC05MWNkLTdiNmY2Y2EwNGZmYyIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJzZWxmaWVfZmlsZXMiLCJmaWxlX2luZm8iOiJwcm9jZXNzZWQiLCJleHAiOjE2OTU0MDI2ODB9.fRiryXV74R3McIM5jIrj78cs2TmQYwIfm7p1OBy_-0g\",\"byte-size\":148738}],\"video-url\":null,\"entity-confidence-reasons\":[],\"document-similarity-score\":null,\"selfie-similarity-score-left\":null,\"selfie-similarity-score-right\":null,\"checks\":[{\"name\":\"selfie_id_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"selfie_pose_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"selfie_multiple_faces_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"selfie_pose_repeat_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"selfie_account_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_suspicious_entity_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_liveness_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"required\",\"metadata\":{}},{\"name\":\"selfie_glasses_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_glare_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_public_figure_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_age_comparison\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}},{\"name\":\"selfie_face_covering_detection\",\"status\":\"passed\",\"reasons\":[],\"requirement\":\"not_required\",\"metadata\":{}}],\"capture-method\":\"video\"},\"relationships\":{\"inquiry\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\"}},\"template\":{\"data\":null},\"inquiry-template-version\":{\"data\":{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\"}},\"inquiry-template\":{\"data\":{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\"}},\"verification-template\":{\"data\":{\"type\":\"verification-template/selfie\",\"id\":\"vtmpl_k3XWoG1jhHZZhA7YH7iQFxxg\"}},\"verification-template-version\":{\"data\":{\"type\":\"verification-template-version/selfie\",\"id\":\"vtmplv_3aGAT4gN8LMSzD7kJKQC5Skt\"}}}},{\"type\":\"inquiry-session\",\"id\":\"iqse_vmwujCbnPDKkyktE6LMBF5UQ\",\"attributes\":{\"status\":\"active\",\"created-at\":\"2023-09-22T11:10:40.000Z\",\"ip-address\":\"95.25.21.20\",\"user-agent\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36\",\"os-name\":\"Windows\",\"os-full-version\":\"10\",\"device-type\":\"desktop\",\"device-name\":null,\"browser-name\":\"Chrome\",\"browser-full-version\":\"116.0.0.0\",\"mobile-sdk-name\":null,\"mobile-sdk-full-version\":null,\"is-proxy\":false,\"is-tor\":false,\"is-datacenter\":false,\"threat-level\":\"low\",\"country-code\":\"US\",\"country-name\":\"United States\",\"region-code\":\"CA\",\"region-name\":\"California\",\"latitude\":37.751,\"longitude\":-97.822},\"relationships\":{\"inquiry\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\"}}}},{\"type\":\"document/government-id\",\"id\":\"doc_XjBsPH3ZBF2P3ppnoCLUaRLu\",\"attributes\":{\"status\":\"processed\",\"created-at\":\"2023-09-22T11:10:55.000Z\",\"processed-at\":\"2023-09-22T11:10:58.000Z\",\"processed-at-ts\":1695381058,\"front-photo\":{\"filename\":\"photo1.jpg\",\"url\":\"https://files.withpersona.com/photo1.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiY3htYzdjMXR3OHJlZGk5NGE5emV0dTZ4Njk4IiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDgwLCJuYmYiOjE2OTUzODEwODAsImp0aSI6IjdlZjY0NDJlLWNjNWUtNDk1Yy05OWNjLWE1N2U3Y2QwYTA1YyIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoicHJvY2Vzc2VkIiwiZXhwIjoxNjk1NDAyNjgwfQ.OHAat5Qs-pjgy08g_FxvUM7DU2c-ILE5YFwag8qVueM\",\"byte-size\":309608},\"back-photo\":null,\"selfie-photo\":{\"filename\":\"selfie_photo.jpg\",\"url\":\"https://files.withpersona.com/selfie_photo.jpg?access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJnZzExbXBqMjAyOHRwbHR3Y3VhbTVtdnhwc3MzIiwiYXVkIjoiZmlsZXMud2l0aHBlcnNvbmEuY29tIiwiaXNzIjoid2l0aHBlcnNvbmEuY29tIiwiaWF0IjoxNjk1MzgxMDgwLCJuYmYiOjE2OTUzODEwODAsImp0aSI6IjM3NzcwNjYyLTE0YTktNDgyNC1iNzAxLTFhZTYzMGJkMzI3MCIsImdjc19idWNrZXQiOiJwZXJzb25hLXdlYiIsImZpbGVfZW5jcnlwdGVkIjp0cnVlLCJmaWxlX3NhbHQiOiJnb3Zlcm5tZW50X2lkX2ZpbGVzIiwiZmlsZV9pbmZvIjoic2VsZmllX3Bob3RvIiwiZXhwIjoxNjk1NDAyNjgwfQ.6GzftUQ4am2B0WvkNYg6TsRrbPM1FOeVP5CN1zqWo0U\",\"byte-size\":309608},\"id-class\":\"dl\",\"name-first\":\"ALEXANDER J\",\"name-middle\":null,\"name-last\":\"SAMPLE\",\"name-suffix\":null,\"birthdate\":\"1977-07-17\",\"address-street-1\":\"600 CALIFORNIA STREET\",\"address-street-2\":null,\"address-city\":\"SAN FRANCISCO\",\"address-subdivision\":\"CA\",\"address-postal-code\":\"94109\",\"issuing-authority\":\"CA\",\"issuing-subdivision\":\"CA\",\"nationality\":null,\"document-number\":null,\"visa-status\":null,\"issue-date\":\"2022-09-22\",\"expiration-date\":\"2028-09-22\",\"designations\":null,\"birthplace\":null,\"height\":null,\"sex\":\"Male\",\"endorsements\":null,\"restrictions\":null,\"vehicle-class\":null,\"identification-number\":\"I1234562\"},\"relationships\":{\"inquiry\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\"}},\"template\":{\"data\":null},\"inquiry-template-version\":{\"data\":{\"type\":\"inquiry-template-version\",\"id\":\"itmplv_SAKWu7A6EHJGhiaGRHfgkSZF\"}},\"inquiry-template\":{\"data\":{\"type\":\"inquiry-template\",\"id\":\"itmpl_gymYN49rWeGu8BHk1c5A5Xun\"}},\"document-files\":{\"data\":[]}}},{\"type\":\"selfie/profile-and-center\",\"id\":\"self_YLC5N27eGcMBHAb52yTDWG3q\",\"attributes\":{\"status\":\"processed\",\"created-at\":\"2023-09-22T11:11:13.845Z\",\"processed-at\":\"2023-09-22T11:11:16.000Z\"},\"relationships\":{\"inquiry\":{\"data\":{\"type\":\"inquiry\",\"id\":\"inq_8Rb9fBMWr9VVnr9pqFMmSLTZ\"}}}}]},\"created-at\":\"2023-09-22T11:11:18.790Z\"}}}"));
  const t = String(new Date().getTime());
  const v1 = crypto.createHmac("sha256", config.personaHookSecret)
    .update(`${t}.${webhookBody}`)
    .digest("hex");

  const webhookResp = await fastify.inject({
    method: "POST",
    url: personaWebhookEP,
    headers: {
      "Content-Type": "application/json",
      "Persona-Signature": `t=${t},v1=${v1}`
    },
    payload: JSON.parse(webhookBody)
  });
  a.is(
    webhookResp.statusCode, 200,
    `Webhook is not handel. error: ${webhookResp.body}`
  );
  a.equal(
    JSON.parse(webhookResp.body),
    { message: "ok" },
    `Webhook response body is not matched`
  );
  const session = sessionCache?.get(refId);
  a.ok(session?.webhookResult, "No webhook result in Passport issuer session");

  const canIssueAfterResp = await fastify.inject({
    method: "GET",
    url: zkc.EPs.v1("Passport").canIssue,
    query: { sessionId: refId }
  });
  a.is(
    canIssueAfterResp.statusCode, 200,
    `Can issue after webhook status code is not 200. error: ${canIssueAfterResp.statusCode}`
  );
  const canIssueAfter: ZkcCanIssueResp = JSON.parse(canIssueAfterResp.body);
  a.is(
    canIssueAfter.canIssue, true,
    "Can issue after webhook response must be true"
  );

  const minaClient = new Client({ network: "mainnet" });
  const {
    signature: {
      field,
      scalar
    }
  } = minaClient.signMessage(
    challenge.message,
    minaSupport.privateKey
  );
  const sign = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();
  const issueReq: ZkcIssueReq = {
    sessionId: refId,
    signature: sign
  };
  const issueResp = await fastify.inject({
    method: "POST",
    url: zkc.EPs.v1("Passport").issue,
    payload: issueReq
  });
  a.is(
    issueResp.statusCode, 200,
    `Issue response status code is not 200. error ${issueResp.body}`
  );
  const zkCred: ZkCredProved = JSON.parse(issueResp.body);
  const proof = zkCred.proof[0]!;
  a.ok(proof, "Passport credential does not contains proof");
  // @ts-ignore
  zkCred.proof = undefined;
  const prepared = zkc.preparator.prepare<Field[]>(zkCred, proof.transformSchema);
  a.equal({
    isr: {
      id: zkCred.isr.id
    },
    sch: zkCred.sch,
    exd: zkCred.exd,
    sbj: zkCred.sbj
  }, {
    isr: {
      id: {
        t: 0,
        k: PrivateKey.fromBase58(config.minaPrivateKey).toPublicKey().toBase58()
      }
    },
    sch: 0,
    exd: 0,
    sbj: {
      id: {
        t: 0,
        k: minaSupport.publicKey
      },
      bd: 2208988800000 + new Date("1977-07-17").getTime(),
      cc: 840,
      doc: {
        id: "I1234562",
        t: 2
      },
      fn: "ALEXANDER J",
      ln: "SAMPLE"
    }
  }, "Passport credential properties is not matched");
  const hash = Poseidon.hash(prepared);
  const signature = Signature.fromBase58(proof.sign);
  const verified = signature.verify(PublicKey.fromBase58(proof.key), [hash]).toBoolean();
  a.is(verified, true, "Passport ZKC is not verified");

  sinon.restore();
});

test.run();

