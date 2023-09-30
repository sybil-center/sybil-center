import { suite } from "uvu";
import Client from "mina-signer";
import { Field, PrivateKey, Scalar, Signature } from "snarkyjs";
import * as a from "uvu/assert";
// import { ZkcMina, ZkSybil } from "@sybil-center/zkc-o1js";
// import { ZkSybil } from "@sybil-center/zkc-core";
// import { zkc } from "../../src/util/zk-credentials.util.js";
// import { rest } from "../../src/util/fetch.util.js";
// import { ZkCredProved } from "../../src/base/types/zkc.credential.js";
// import { ZkcCanIssueResp, ZkcChallengeReq, ZkcIssueReq } from "../../src/base/types/zkc.issuer.js";
// import { PassportChallenge } from "../../src/issuers/zkc/passport/issuer.js";

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

test("simple", () => {
  const y1900 = new Date("1900-01-01T00:00:00.000Z");
  console.log(y1900.toISOString());
  console.log(y1900.getTime());
  const number = 2208987017000;
  const dif = y1900.getTime() + number;
  console.log("Diff in MS", dif);
});

// test("sing", async () => {
//   const minaClient = new Client({ network: "mainnet" });
//   const privateKey = PrivateKey.random();
//   console.log("Private key:", privateKey.toBase58());
//   const publicKey = privateKey.toPublicKey();
//   console.log("Public key:", publicKey.toBase58());
//
//   const sybil = new ZkSybil(new URL("https://api.dev.sybil.center"));
//   const issuer = sybil.issuer("passport");
//   const challenge = await issuer.getChallenge({
//     subjectId: {
//       t: "mina",
//       k: publicKey.toBase58()
//     }
//   });
//
//   console.log("verify url", challenge.verifyURL);
//
//   const result = await repeatUntil<{ canIssue: boolean }>(
//     (result) => result instanceof Error || result.canIssue,
//     2000,
//     () => issuer.canIssue({ sessionId: challenge.sessionId })
//   );
//   if (result instanceof Error) throw result;
//
//   const {
//     signature: {
//       field,
//       scalar
//     }
//   } = minaClient.signMessage(challenge.message, privateKey.toBase58());
//
//   const sign = Signature.fromObject({
//     r: Field.fromJSON(field),
//     s: Scalar.fromJSON(scalar)
//   }).toBase58();
//
//   const zkCred = await issuer.issue({
//     signature: sign,
//     sessionId: challenge.sessionId
//   });
//
//   console.log(JSON.stringify(zkCred, null, 2));
//   const verified = await ZkcMina.verifyCred(zkCred);
//   console.log("verified", verified);
// });


test.run();

export function repeatUntil<T>(
  shouldStop: (t: T | Error) => boolean,
  betweenMS: number,
  fn: () => Promise<T>
) {
  return new Promise<T | Error>(async (resolve) => {
    let shouldProceed = true;
    while (shouldProceed) {
      const result = await execute(fn);
      if (shouldStop(result)) {
        shouldProceed = false;
        return resolve(result);
      }
      await new Promise((resolve1) => setTimeout(resolve1, betweenMS));
    }
  });
}

async function execute<T>(
  fn: () => Promise<T>
): Promise<T | Error> {
  try {
    return await fn();
  } catch (e) {
    return e as Error;
  }
}
