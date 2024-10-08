import { Const, equal, greater, greaterOrEqual, less, mul, Ref, Setup, Static, sub } from "@jaljs/js-zcred";
import type { O1GraphLink } from "o1js-trgraph";
import { PassportInputSchema, Sandbox } from "./index.js";

const attributePath = ["private", "credential", "attributes"];
const subjectPath = [...attributePath, "subject"];
const proofPath = [
  "private",
  "credential",
  "proofs",
  "mina:poseidon-pasta",
  "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2"
];

export const DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA: PassportInputSchema<O1GraphLink> = {
  credential: {
    attributes: {
      type: Ref(Setup(
        [...attributePath, "type"],
        ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
      )),
      issuanceDate: Ref(Setup(
        [...attributePath, "issuanceDate"],
        ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
      )),
      validFrom: Ref(Setup(
        [...attributePath, "validFrom"],
        ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
      )),
      validUntil: Ref(Setup(
        [...attributePath, "validUntil"],
        ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
      )),
      subject: {
        id: {
          type: Ref(Setup(
            [...subjectPath, "id", "type"],
            ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
          )),
          key: Ref(Setup(
            [...subjectPath, "id", "key"],
            ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
          ))
        },
        birthDate: Ref(Setup(
          [...subjectPath, "birthDate"],
          ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
        )),
        firstName: Ref(Setup(
          [...subjectPath, "firstName"],
          ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
        )),
        gender: Ref(Setup(
          [...subjectPath, "gender"],
          ["ascii-bytes", "bytes-uint64", "uint64-mina:field"]
        )),
        lastName: Ref(Setup(
          [...subjectPath, "lastName"],
          ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
        )),
      },
      countryCode: Ref(Setup(
        [...attributePath, "countryCode"],
        ["iso3166alpha3-iso3166numeric", "iso3166numeric-uint16", "uint16-mina:field"]
      )),
      document: {
        id: Ref(Setup(
          [...attributePath, "document", "id"],
          ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
        )),
        sybilId: Ref(Setup(
          [...attributePath, "document", "sybilId"],
          ["base58-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
        ))
      }
    },
    proof: {
      issuer: {
        id: {
          type: Ref(Setup(
            [...proofPath, "issuer", "id", "type"],
            ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
          )),
          key: Ref(Setup(
            [...proofPath, "issuer", "id", "key"],
            ["base58-mina:publickey"]
          ))
        }
      },
      signature: Ref(Setup(
        [...proofPath, "signature"],
        ["base58-mina:signature"]
      ))
    }
  },
  context: {
    now: Ref(Setup(
      ["public", "context", "now"],
      ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
    ))
  }
};

export const O1JS_ETH_DEV: Sandbox = {
  inputSchema: DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA,
  fromCountry: (alpha3CountryCode: string) => {
    const {
      credential,
    } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
    return equal(
      credential.attributes.countryCode,
      Static(alpha3CountryCode, [
        "iso3166alpha3-iso3166numeric", "iso3166numeric-uint16", "uint16-mina:field"
      ])
    );
  },
  olderThanYears: (years: number) => {
    const {
      credential,
      context
    } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
    return greaterOrEqual(
      sub(context.now, credential.attributes.subject.birthDate),
      mul(Static(years, ["uint64-mina:field"]), Const("year"))
    );
  },
  youngerThanYears: (years: number) => {
    const {
      credential,
      context
    } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
    return less(
      sub(context.now, credential.attributes.subject.birthDate),
      mul(Static(years, ["uint64-mina:field"]), Const("year"))
    );
  },
  passportNotExpired: () => {
    const {
      credential,
      context
    } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
    return greater(credential.attributes.validUntil, context.now);
  },
  genderIs: (gender) => {
    const {
      credential
    } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
    return equal(
      credential.attributes.subject.gender,
      Static(gender, ["ascii-bytes", "bytes-uint64", "uint64-mina:field"])
    );
  }
};