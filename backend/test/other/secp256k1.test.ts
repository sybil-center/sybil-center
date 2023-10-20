import { secp256k1 } from "@noble/curves/secp256k1";
import { suite } from "uvu";

const test = suite("OTHER: secp256k1 test");

test("create private key", async () => {
  const privatekey = secp256k1.utils.randomPrivateKey();
  console.log(Buffer.from(privatekey).toString("hex"));
})

test.run();
