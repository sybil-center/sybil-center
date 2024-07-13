import { assert, Const, greaterOrEqual, mul, Static, sub, toJAL } from "@jaljs/js-zcred";
import { suite } from "uvu";
import { DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA } from "../src/index.js";
import { FriendlyZCredTranslator } from "@jaljs/friendly-zcred";

const test = suite("o1js ethereum passport test");

test("create correct JAL", async () => {
  const {
    credential,
    context
  } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
  const attributes = credential.attributes;
  const jalProgram = toJAL({
    target: "o1js:zk-program.cjs",
    credential: credential,
    publicInput: [
      attributes.subject.id.type,
      attributes.subject.id.key,
      attributes.document.sybilId,
      context.now
    ],
    commands: [
      assert(
        greaterOrEqual(
          sub(context.now, attributes.subject.birthDate),
          mul(Static(18, ["uint64-mina:field"]), Const("year"))
        )
      )
    ],
    options: {
      signAlgorithm: "mina:pasta",
      hashAlgorithm: "mina:poseidon"
    }
  });
  const translated = new FriendlyZCredTranslator(jalProgram, {
    type: "document type (passport)",
    validFrom: "passport valid from date",
    issuanceDate: "passport issuance date",
    validUntil: "passport valid until",
    subject: {
      id: {
        type: "passport owner public key type",
        key: "passport owner public key"
      },
      firstName: "passport owner first name",
      lastName: "passport owner last name",
      birthDate: "passport owner birth date",
      gender: "passport owner gender"
    },
    countryCode: "passport country code",
    document: {
      id: "passport id (should be private)",
      sybilId: "document unique public id"
    }
  }).translate();
  console.log(translated);
});

test.run();
