import { assert, not, toJAL } from "@jaljs/js-zcred";
import { suite } from "uvu";
import { O1JS_ETH_DEV } from "../src/index.js";
import { FriendlyZCredTranslator } from "@jaljs/friendly-zcred";

const test = suite("o1js ethereum passport test");

test("create correct JAL", async () => {
  const {
    inputSchema: {
      credential,
      context
    },
    olderThanYears,
    youngerThanYears,
    genderIs,
    fromCountry,
    passportNotExpired,
  } = O1JS_ETH_DEV;
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
      assert(olderThanYears(18)),
      assert(youngerThanYears(45)),
      assert(genderIs("male")),
      assert(not(fromCountry("USA"))),
      assert(passportNotExpired())
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
