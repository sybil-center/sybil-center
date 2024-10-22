# Sybil Passport

Sybil Passport input schema, description and so on

## Dev

### Create JAL program

```typescript
import { getPassportSandbox } from "@sybil-center/passport";
import { assert, not, toJAL } from "@jaljs/js-zcred";


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
} = getPassportSandbox({
  subjectKeyType: "ethereum:address",
  zkProofSystem: "o1js",
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