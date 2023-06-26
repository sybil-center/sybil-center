import { suite } from "uvu";
import sinon from "sinon";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";
import * as a from "uvu/assert";
import { sinonUtil } from "../../../../support/sinon.util..js";
import { random } from "../../../../../src/util/random.util.js";
import { App } from "../../../../../src/app/app.js";
import { thrown } from "../../../../support/thrown.support.js";
import { configDotEnv } from "../../../../../src/util/dotenv.util.js";

const test = suite("INTEGRATION: apikey service");

let app: App;

test.before(async () => {
  const testConfig = new URL("../../../../env-config/test.env", import.meta.url);
  configDotEnv({ path: testConfig, override: true });
  app = await App.init();
});

test.after(async () => {
  await app.close();
});

test("should create if apikey not found and verify", async () => {
  const accountId = ethereumSupport.info.ethereum.accountId;
  const apikeyService = app.context.resolve("apikeyService");
  const apikeyRepo = app.context.resolve("apikeyRepo");
  let apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves(null)
  );
  const apikeyRepo_create = sinonUtil.replace(
    apikeyRepo, "create", sinon.fake.resolves({
      accountId: accountId,
      reqCount: 0
    })
  );
  const created = await apikeyService.findOrCreate({ accountId: accountId });
  a.ok(created.apiKey, "created apikey not present ");
  a.ok(created.secretKey, "created secret not present");
  a.is(apikeyRepo_find.callCount, 1, "apikey repo find method not called");
  a.is(apikeyRepo_create.callCount, 1, "apikey repo create method not called");
  sinon.restore(); // restore fake & create new
  apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves({ accountId, reqCount: 0 })
  );
  const {
    originKey: originApikey,
    isSecret: notSecret
  } = await apikeyService.verifyKey(created.apiKey);
  a.is(originApikey, accountId, "origin apikey not matched with account id");
  a.is(notSecret, false, "apikey has not to be secret");
  a.is(apikeyRepo_find.callCount, 1, "apikey repo find method not called after creating");

  const {
    originKey: originSecretKey,
    isSecret
  } = await apikeyService.verifyKey(created.secretKey);
  a.is(originSecretKey, accountId, "origin secret key not matched with account id");
  a.is(isSecret, true, "origin secret key has to be secret");
  a.is(apikeyRepo_find.callCount, 2, "apikey repo find method not called after creating");

  sinon.restore();
});

test("should create, refresh and handle", async () => {
  const accountId = ethereumSupport.info.ethereum.accountId;
  const apikeySalt = random.string(27);
  const secretSalt = random.string(27);
  const apikeyService = app.context.resolve("apikeyService");
  const apikeyRepo = app.context.resolve("apikeyRepo");
  let apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves(null)
  );
  const apikeyRepo_create = sinonUtil.replace(
    apikeyRepo, "create", sinon.fake.resolves({
      accountId,
      reqCount: 0
    })
  );
  const created = await apikeyService.findOrCreate({ accountId });
  a.ok(created.apiKey, "created apikey not present");
  a.ok(created.secretKey, "created secretkey not present");
  a.is(apikeyRepo_find.callCount, 1, "apikey repo method find not called");
  a.is(apikeyRepo_create.callCount, 1, "apikey repo method create not called");
  sinon.restore();

  let apikeyRepo_update = sinonUtil.replace(
    apikeyRepo, "update", sinon.fake.resolves({
      accountId: accountId,
      reqCount: 0,
      secretSalt: secretSalt,
      apikeySalt: apikeySalt
    })
  );
  apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves({
      accountId,
      apikeySalt: apikeySalt,
      secretSalt: secretSalt,
      reqCount: 0
    })
  );
  const refreshed = await apikeyService.update({ accountId }, { refresh: true });
  a.ok(refreshed.apiKey, "refreshed apikey not present");
  a.ok(refreshed.secretKey, "refreshed secret not present");
  a.is(apikeyRepo_update.callCount, 1, "apikey repo update method not called");

  const {
    originKey: originApikey,
    isSecret: notSecret
  } = await apikeyService.verifyKey(refreshed.apiKey);
  const apikeySaltFrom = originApikey.split(":").pop();
  a.is(apikeySaltFrom, apikeySalt, "apikey salt & verified apikey salt not matched");
  a.is(notSecret, false, "apikey has not to be secret");
  a.is(
    apikeyRepo_find.callCount, 1,
    "apikey repo method find not called after refresh on verify apikey"
  );

  const {
    originKey: originSecret,
    isSecret
  } = await apikeyService.verifyKey(refreshed.secretKey);
  const secretSaltFrom = originSecret.split(":").pop();
  a.is(secretSaltFrom, secretSalt, "secret salt & verified secret salt not matched");
  a.is(isSecret, true, "secret key has to be secret");
  a.is(
    apikeyRepo_find.callCount, 2,
    "apikey repo method not called after refresh on verify secretkey"
  );
  sinon.restore();

  apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves({
      accountId: accountId,
      secretSalt: secretSalt,
      apikeySalt: apikeySalt,
      reqCount: 0
    })
  );

  apikeyRepo_update = sinonUtil.replace(
    apikeyRepo, "update", sinon.fake.resolves({
      accountId: accountId,
      secretSalt: secretSalt,
      apikeySalt: apikeySalt,
      reqCount: 1
    })
  );

  await apikeyService.handleKey(refreshed.apiKey);
  a.is(apikeyRepo_find.callCount, 2, "apikey repo method find not called after handle key");
  a.is(apikeyRepo_update.callCount, 1, "apikey repo method update not called after handle key");
});

test("should create on verify if apikeys not store", async () => {
  const apikeyRepo = app.context.resolve("apikeyRepo");
  const apikeyService = app.context.resolve("apikeyService");
  const accountId = ethereumSupport.info.ethereum.accountId;
  sinonUtil.replace(apikeyRepo, "create", sinon.fake.resolves({
    accountId: accountId,
    reqCount: 0
  }));
  const { apiKey, secretKey } = await apikeyService["create"]({ accountId });
  sinon.restore();
  const apikeyRepo_create = sinonUtil.replace(
    apikeyRepo, "create", sinon.fake.resolves({
      accountId: accountId,
      reqCount: 0
    })
  );
  const apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves(null)
  );
  const {
    originKey: originApikey,
    isSecret: notSecret
  } = await apikeyService.verifyKey(apiKey);
  const accountIdFromApikey = originApikey.split(":").slice(0, 3).join(":");
  a.is(
    accountIdFromApikey, accountId,
    "account id from apikey not matched with expected account id"
  );
  a.is(notSecret, false, "apikey has to be not secret");
  a.is(
    apikeyRepo_find.callCount, 1,
    "apikey repo find method not called after verify apikey"
  );
  a.is(
    apikeyRepo_create.callCount, 1,
    "apikey repo create method find not called after verify apikey"
  );
  const {
    originKey: originSecret,
    isSecret: isSecret
  } = await apikeyService.verifyKey(secretKey);
  const accountIdFromSecret = originSecret.split(":").slice(0, 3).join(":");
  a.is(
    accountIdFromSecret, accountId,
    "account id from verified secret not matched with expected account id"
  );
  a.is(isSecret, true, "secret key has to be secret");
  a.is(
    apikeyRepo_find.callCount, 2,
    "apikey repo find method not called after verify secret key"
  );
  a.is(
    apikeyRepo_create.callCount, 2,
    "apikey repo method create not called after verify secret key"
  );
  sinon.restore();
});

test("should handle key with & with out checkOnlySecret", async () => {
  const apikeyRepo = app.context.resolve("apikeyRepo");
  const apikeyService = app.context.resolve("apikeyService");
  const apikeySalt = random.string(27);
  const secretSalt = random.string(27);
  const accountId = ethereumSupport.info.ethereum.accountId;
  const apikeyRepo_find = sinonUtil.replace(
    apikeyRepo, "find", sinon.fake.resolves({
      accountId: accountId,
      apikeySalt: apikeySalt,
      secretSalt: secretSalt,
      onlySecret: true,
      reqCount: 0
    })
  );
  const { apiKey, secretKey } = await apikeyService.findOrCreate({ accountId });
  a.is(
    apikeyRepo_find.callCount, 1,
    "apikey repo find method not call after call apikeyService.findOrCreate"
  );
  const isThrown = await thrown(() => apikeyService.handleKey(apiKey, true));
  a.is(
    isThrown, true,
    "only secret key has to be verified on apikeyService.handleKey"
  );
  a.is(
    apikeyRepo_find.callCount, 2,
    "apikey repo method find not called after apikeyService.handleKey(apikey) call"
  );
  const {
    originKey: originSecretKey,
    isSecret: isSecret
  } = await apikeyService.verifyKey(secretKey, true);
  const accountIdFromSecret = originSecretKey.split(":").slice(0, 3).join(":");
  a.is(
    accountIdFromSecret, accountId,
    "account id from secret key not matched with expected account id"
  );
  a.is(isSecret, true, "secret key has to be secret");
  a.is(
    apikeyRepo_find.callCount, 3,
    "apikey repo method find not called after apikeyService.handleKey(secretKey) call"
  );
  sinon.restore();
});

test.run();
