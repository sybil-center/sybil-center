import { suite } from "uvu";
import { App } from "../../../../../src/app/app.js";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";
import * as a from "uvu/assert";
import { configDotEnv } from "../../../../../src/util/dotenv.util.js";

const test = suite("INTEGRATION: credential verifier test");

let app: App;

test.before(async () => {
  const testConfig = new URL("../../../../env-config/test.env", import.meta.url);
  configDotEnv({ path: testConfig, override: true });
  app = await App.init()
});

test.after(async () => {
  await app.close();
});

test("should verify ethereum account credential", async () => {
  const issuer = app.context.resolve("ethereumAccountIssuer");
  const verifier = app.context.resolve("credentialVerifier");
  const { didPkh } = ethereumSupport.info.ethereum;
  const {
    issueMessage,
    sessionId
  } = await issuer.getChallenge({ subjectId: didPkh });
  const signature = await ethereumSupport.sign(issueMessage);
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
  const { issueMessage, sessionId } = await issuer.getChallenge({
    subjectId: didPkh,
    expirationDate: date
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature,
  });
  const { isVerified } = await verifier.verify(credential);
  a.is(isVerified, false, "credential has to be expired");
});

test.run();
