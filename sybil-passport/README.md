# Sybil Passport

Sybil Passport input schema, description and so on

## Dev

### Create JAL program

```typescript
import { DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA } from "@sybil-center/passport";

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
```