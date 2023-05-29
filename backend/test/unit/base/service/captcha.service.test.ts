import { suite } from "uvu";
import * as a from "uvu/assert";
import { createInjector } from "typed-inject";
import { Logger } from "../../../../src/backbone/logger.js";
import { Config } from "../../../../src/backbone/config.js";
import { CaptchaService } from "../../../../src/base/service/captcha.service.js";
import sinon from "sinon";

const test = suite("UNIT: captcha service tests");

const context = createInjector()
  .provideClass("logger", Logger)
  .provideClass("config", Config)
  .provideClass("captchaService", CaptchaService);

const captchaService = context.resolve("captchaService");

const action = "auth";

const humanAssessment = {
  tokenProperties: {
    valid: true,
    action: action
  },
  riskAnalysis: {
    score: 0.9,
    reasons: []
  }
};

const robotAssessment = {
  tokenProperties: {
    valid: true,
    action: action
  },
  riskAnalysis: {
    score: 0,
    reasons: []
  }
};

test("should proof humanity", async () => {
  // @ts-ignore
  sinon.stub(captchaService, "getAssessment").resolves(humanAssessment);
  const { isHuman } = await captchaService.isHuman("test", action);
  a.is(isHuman, true, "is human result not matched");
  sinon.restore();
});

test("should detect robot", async () => {
  // @ts-ignore
  sinon.stub(captchaService, "getAssessment").resolves(robotAssessment);
  const { isHuman } = await captchaService.isHuman("test", action);
  a.is(isHuman, false, "robot action has to be detected");
  sinon.restore();
});

test("should throw error because action is not match", async () => {
  // @ts-ignore
  sinon.stub(captchaService, "getAssessment").resolves(humanAssessment);
  let thrown = false
  try {
    await captchaService.isHuman("test", "incorrect action");
  } catch (e) {
    thrown = true
  }
  a.is(thrown, true, "captchaService.isHuman method has to throw error");
  sinon.restore();
});

test("should proof humanity without action", async () => {
  // @ts-ignore
  sinon.stub(captchaService, "getAssessment").resolves(humanAssessment);
  const { isHuman } = await captchaService.isHuman("test");
  a.is(isHuman, true, "is human result not matched");
  sinon.restore();
});

test.run();
