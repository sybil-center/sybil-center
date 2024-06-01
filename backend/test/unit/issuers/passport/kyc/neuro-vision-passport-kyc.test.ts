import { suite } from "uvu";
import { WebhookResult } from "../../../../../src/issuers/passport/types.js";
import { NeuroVisionPassportKYC } from "../../../../../src/issuers/passport/kyc/neuro-vision-passport-kyc.js";
import * as a from "uvu/assert"

const test = suite("Neuro vision passport kyc");

const webhookBody = {
  "clientId": "11111111-2222-3333-4444-555555555555",
  "createdAt": "2024-05-27T13:35:34.313Z",
  "results": [
    {
      "status": "success",
      "type": "document",
      "spent": 3.079,
      "errors": [],
      "tries": 1,
      "docName": "RUS - ePassport (2010)",
      "checks": [
        {
          "caption": "fraud",
          "items": [
            {
              "status": "success",
              "caption": "isEdited"
            }
          ]
        }
      ],
      "ocr": {
        "status": "success",
        "fields": [
          {
            "title": "MRZStrings",
            "value": "P<RUSPAL<<PAVEL<<<<<<<<<<<<<<<<<<<<<<<<<<<<<^4382475852RUS7705256M2901019<<<<<<<<<<<<<<02",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DocumentClassCode",
            "value": "P",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "IssuingStateCode",
            "value": "RUS",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "Surname&GivenNames",
            "value": "PAL  PAVEL",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DocumentNumber",
            "value": "111222333",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DocumentNumberCheckdigit",
            "value": "9",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "NationalityCode",
            "value": "RUS",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DateOfBirth",
            "value": "771029",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DateOfBirthCheckdigit",
            "value": "1",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "Sex",
            "value": "M",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DateOfExpiry",
            "value": "290825",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "DateOfExpiryCheckdigit",
            "value": "3",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "OptionalData",
            "value": "<<<<<<<<<<<<<<",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "OptionalDataCheckdigit",
            "value": "0",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "FinalCheckdigit",
            "value": "4",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "MRZType",
            "value": "ID-3",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "Surname",
            "value": "PAL",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          },
          {
            "title": "GivenNames",
            "value": "PAVEL",
            "conf": "high",
            "isUnreadable": false,
            "isModified": false,
            "isEdited": false,
            "isMismatch": false,
            "imageIndex": 0
          }
        ]
      },
      "images": [
        "https://api.enface.ai/images/kyc"
      ],
      "imagesFull": [
        "https://api.enface.ai/images/kycfull"
      ]
    }
  ],
  "sessionId": "11111111-2222-3333-4444-555555555555",
  "spent": 43.458,
  "status": "success",
  "isClientNew": false,
  "clientKey": "11111111-2222-3333-4444-555555555555",
  "schemaId": "11111111-2222-3333-4444-555555555555"
};

test("handleWebhook", async () => {
  const kyc = new NeuroVisionPassportKYC({
    neuroVisionSecretKey: "123",
    neuroVisionSchemaId: "456",
    pathToExposeDomain: new URL("https://test.com")
  });
  // @ts-expect-error
  const result = await kyc.handleWebhook({ body: webhookBody });
  a.equal(result, {
    verified: true,
    reference: "11111111-2222-3333-4444-555555555555",
    passport: {
      validFrom: result!.passport!.validFrom,
      validUntil: `2029-01-01T00:00:00.000Z`,
      subject: {
        firstName: "PAVEL",
        lastName: "PAL",
        birthDate: "1977-05-25T00:00:00.000Z",
        gender: "male"
      },
      countryCode: "RUS",
      document: {
        id: "438247585"
      }
    }
  } satisfies WebhookResult)

});

test.run();
