import { suite } from "uvu";
import Client from "mina-signer";
import { Field, PrivateKey, Scalar, Signature } from "o1js";
import * as a from "uvu/assert";
import { HttpIssuer, ZChallengeReq } from "@zcredjs/core";
import { minaSupport } from "../support/chain/mina.js";

const test = suite("Mina-Snaky.js tests");

test("create and verify signature", () => {
  const client = new Client({ network: "mainnet" });
  const privatekey = PrivateKey.random();
  const sign = client.signMessage("hello", privatekey.toBase58());
  const signerVerified = client.verifyMessage(sign);
  a.is(signerVerified, true, `Verification sign result from mina-signer is not matched`);

  const circSign = Signature.fromObject({
    r: Field.fromJSON(sign.signature.field),
    s: Scalar.fromJSON(sign.signature.scalar)
  });
  const snarkyVerified = client.verifyMessage({
    signature: {
      field: circSign.toJSON().r,
      scalar: circSign.toJSON().s
    },
    publicKey: privatekey.toPublicKey().toBase58(),
    data: "hello"
  });
  a.is(snarkyVerified, true, `Verification sign result from snarkyjs in not matched`);
});

test("invalid signature behavior", () => {
  const client = new Client({ network: "mainnet" });
  const privatekey = PrivateKey.random();
  const sign = client.signMessage("not_hello", privatekey.toBase58());
  sign.data = "hello";
  const notVerified = client.verifyMessage(sign);
  a.is(notVerified, false, `Invalid sign MUST NOT be verified`);
});

test("", async () => {
  const client = new Client({ network: "mainnet" });
  const privateKey = PrivateKey.fromBase58(minaSupport.privateKey);
  const issuer = new HttpIssuer("https://api.dev.sybil.center/api/v1/zcred/issuers/passport/");
  const challengeReq: ZChallengeReq = {
    subject: {
      id: { type: "mina:publickey", key: privateKey.toPublicKey().toBase58() }
    },
    validUntil: new Date(2030, 0, 1).toISOString(),
    options: {
      chainId: "mina:mainnet"
    }
  };
  const challenge = await issuer.getChallenge(challengeReq);
  console.log(JSON.stringify(challenge));
  console.log(challenge.verifyURL);


});

test.run();

