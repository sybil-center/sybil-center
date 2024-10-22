# Sybil Passport

The library will help you create a zk-program for user passport authentication based on the [`zCred
protocol`](https://github.com/zcred-org/ZCIPs/)

## Create JAL program

A JAL program is a JSON zk-program description that contains public and private inputs and a list of
constraints that the Passport credential must satisfy.

```typescript
import { getPassportSandbox } from "@sybil-center/passport";
import { assert, not, toJAL } from "@jaljs/js-zcred";

const {
  issuerURI, // issuer URI to get ZK Passpor
  inputSchema: {
    credential,
    context
  },
  olderThanYears,
  youngerThanYears,
  genderIs,
  fromCountry,
  passportNotExpired,
} = getPassportSandbox({
  subjectKeyType: "ethereum:address",
  zkProofSystem: "o1js",
  // isDev: true //for Dev purpuse
});
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
```

## How to use

[Demo application example](https://github.com/zcred-org/third-app/tree/main)