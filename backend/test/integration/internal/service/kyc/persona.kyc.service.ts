import { suite } from "uvu";
import { Config } from "../../../../../src/backbone/config.js";
import { PersonaKYC } from "../../../../../src/services/kyc/persona-kyc.service.js";
import { createInjector, Injector } from "typed-inject";
import { support } from "../../../../support/index.js";
import { configDotEnv } from "../../../../../src/util/dotenv.util.js";
import { minaSupport } from "../../../../support/chain/mina.js";
import sinon from "sinon";
import { rest } from "../../../../../src/util/fetch.util.js";
import * as a from "uvu/assert";


type Context = {
  config: Config,
  personaKYC: PersonaKYC
}


const test = suite("INTEGRATION INTERNAL: Persona KYC service test");

let context: Injector<Context>;
let persona: PersonaKYC;

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  context = createInjector()
    .provideClass("config", Config)
    .provideClass("personaKYC", PersonaKYC);
  persona = context.resolve("personaKYC");
});


const inqCreateResp = {
  "data": {
    "type": "inquiry",
    "id": "inq_ZEbFxoGdE4s8UdFUEBurhy63",
    "attributes": {
      "status": "created",
      "reference-id": "123456",
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

test("create inquiry", async () => {
  sinon.stub(rest, "fetchJson").resolves(inqCreateResp);
  const inqId = "inq_ZEbFxoGdE4s8UdFUEBurhy63";
  const publicKey = minaSupport.publicKey;
  const refId = persona.refId({ t: 0, k: publicKey });
  const inq = await persona.createInquiry({ referenceId: refId });
  a.is(
    inq.inquiryId, inqId,
    "inquiry id not matched after creation"
  );
  a.is(
    inq.verifyURL, `https://withpersona.com/verify?inquiry-id=${inqId}`,
    "verify url is not matched"
  );
  sinon.restore();
});

test.run();

