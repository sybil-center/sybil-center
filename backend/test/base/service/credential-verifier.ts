import { suite } from "uvu";
import { App } from "../../../src/app/app.js";
import { ethereumSupport } from "../../test-support/chain/ethereum.js";
import * as a from "uvu/assert";

const test = suite("Integration: credential verifier");

let app: App;

test.before(async () => {
  app = new App();
  await app.init();
});

test.after(async () => {
  await app.close();
});

test("should verify ethereum account credential", async () => {
  const issuer = app.context.resolve("ethereumAccountIssuer");
  const verifier = app.context.resolve("credentialVerifier");
  const { didPkh } = ethereumSupport.info.ethereum;
  const {
    issueChallenge,
    sessionId
  } = await issuer.getChallenge({ subjectId: didPkh });
  const signature = await ethereumSupport.sign(issueChallenge);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature,
  });
  const { isVerified } = await verifier.verify(credential);
  a.is(isVerified, true);
  credential.issuer.id = "test";
  const { isVerified: isNotVerified } = await verifier.verify(credential);
  a.is(isNotVerified, false, "verify changed credential");
});

test("should not verify expired credential", async () => {
  const issuer = app.context.resolve("ethereumAccountIssuer");
  const verifier = app.context.resolve("credentialVerifier");
  const { didPkh } = ethereumSupport.info.ethereum;
  const date = new Date();
  date.setDate(date.getDate() - 5);
  const { issueChallenge, sessionId } = await issuer.getChallenge({
    subjectId: didPkh,
    expirationDate: date
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature,
  });
  const { isVerified } = await verifier.verify(credential);
  a.is(isVerified, false, "credential has to be expired");
});

test.run();
