import { suite } from "uvu";
import { App } from "../../../../../src/app/app.js";
import { configDotEnv } from "../../../../../src/util/dotenv.util.js";
import * as a from "uvu/assert";
import { appSup } from "../../../../support/app/index.js";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";
import sinon from "sinon";
import { ClientError } from "../../../../../src/backbone/errors.js";
import { thrown } from "../../../../support/thrown.support.js";

const test = suite("INTEGRATION: gate service test");

let app: App;

test.before(async () => {
  const testConfig = new URL("../../../../env-config/test.env", import.meta.url);
  configDotEnv({ path: testConfig, override: true });
  app = await App.init();
});

test.after(async () => {
  await app.close();
});

test("create gate and locks", async () => {
  const gate = app.context.resolve("gateService");

  const notOpenedResult = await gate.build()
    .setLock(async () => {
      return { opened: true, reason: "" };
    })
    .setLock(async () => {
      return { opened: false, reason: "test", errStatus: 400 };
    })
    .open();
  a.is(notOpenedResult?.opened, false, "gate has to be closed");
  a.is(notOpenedResult?.reason, "test", "open result reason not matched");
  a.is(notOpenedResult?.errStatus, 400, "open result err status code not matched");

  const openResult = await gate.build()
    .setLock(async () => {
      return { opened: true, reason: "" };
    })
    .setLock(async () => {
      return { opened: true, reason: "" };
    })
    .open();
  a.is(openResult.opened, true, "gate has to be opened");
});

test("validate & verify credential", async () => {
  const config = app.context.resolve("config");
  const gate = app.context.resolve("gateService");
  const subjectId = ethereumSupport.info.ethereum.didPkh;

  const expiredDate = new Date();
  expiredDate.setTime(expiredDate.getTime() - 100);
  const badCredential = await appSup.issueEthAccountVC({
    app: app,
    subjectId: subjectId,
    signFn: ethereumSupport.sign,
  });
  const notOpen = await gate.build()
    .validateCredential(badCredential, {
      type: "EthereumAccount",
      ttlRange: config.apiKeysCredentialTTL,
    })
    .verifyCredential(badCredential)
    .open();
  a.is(notOpen.opened, false, "open after bad credential as input");

  const expDate = new Date();
  expDate.setTime(expDate.getTime() + config.apiKeysCredentialTTL - 100);
  const credential = await appSup.issueEthAccountVC({
    app: app,
    subjectId: subjectId,
    signFn: ethereumSupport.sign,
    opt: {
      expirationDate: expDate
    }
  });
  const open = await gate.build()
    .validateCredential(credential, {
      type: "EthereumAccount",
      ttlRange: config.apiKeysCredentialTTL
    })
    .verifyCredential(credential)
    .open();
  a.is(
    open.opened, true,
    "gate has to be opened after validate & verify credential"
  );
  a.not.ok(
    open.reason,
    "reason has to be undefined after validate & verify credential"
  );
  a.not.ok(
    open.errStatus,
    "error status code has to be undefined after validate & verify credential"
  );
});

test("validate captcha", async () => {
  const gate = app.context.resolve("gateService");
  const captchaService = app.context.resolve("captchaService");
  sinon.stub(captchaService, "isHuman").resolves({
    isHuman: true,
    score: 0.9,
    reasons: []
  });
  const open = await gate.build()
    .validateCaptcha("testCaptcha", { score: 0.8 })
    .open();
  a.is(open.opened, true, "gate has to be opened");
  sinon.restore();

  sinon.stub(captchaService, "isHuman").resolves({
    isHuman: true,
    score: 0.7,
    reasons: []
  });
  const notOpen = await gate.build()
    .validateCaptcha("testCaptcha", { score: 0.8 })
    .open();
  a.is(notOpen.opened, false, "gate has to be closed, because low score");
  sinon.restore();

  sinon.stub(captchaService, "isHuman").resolves({
    isHuman: false,
    score: 0.1,
    reasons: []
  });
  const notOpen2 = await gate.build()
    .validateCaptcha("testCaptcha")
    .open();
  a.is(notOpen2.opened, false, "gate has to be closed, because not human");
  sinon.restore();
});

test("should throw error from thrower", async () => {
  const gate = app.context.resolve("gateService");
  const isThrown = await thrown(async () => {
    return gate.build()
      .setLock(async () => { return { opened: false, reason: "" };})
      .open((r) => {
        throw new ClientError(r.reason!, r.errStatus);
      });
  });
  a.is(isThrown, true, "should throw error after lock not opened");
});

test("should open or", async () => {
  const gate = app.context.resolve("gateService");
  const { opened, reason } = await gate.build()
    .setLock(async () => ({ opened: false, reason: "test" }))
    .setLock(async () => ({ opened: true, reason: "" }))
    .openOr();
  a.is(opened, true, "opened has to be true");
  a.is(reason, "", "opened reason not matched");

  const isThrown = await thrown(() => {
    return gate.build()
      .setLock(async () => ({ opened: false, reason: "test" }))
      .setLock(async () => ({ opened: false, reason: "test" }))
      .openOr((closed) => {
        throw new ClientError(closed.reason, closed.errStatus);
      });
  });
  a.is(isThrown, true, "has to throw on openOr");
});

test.run();
