import { suite } from "uvu";
import { PrivateKey, PublicKey } from "o1js";
import * as a from "uvu/assert";

const test = suite("OTHER: snarkyjs tests");

const prkey = "EKES51boUFd6HuoDBp4K2tQr4xnSjdJ3Y5jcukC1csG84qi7u1wK";

test("create private and public keys", async () => {
  const privatekey = PrivateKey.fromBase58(prkey);
  const publickey = PublicKey.fromPrivateKey(privatekey);
  a.is(
    publickey.toBase58(), "B62qqtmNTuv2hAeucHCy6mVAUCufMNTQvhsRG9gGgkYk2xMhDmmj5h3",
    `Mina public key is not matched`
  );
});

test.run();
