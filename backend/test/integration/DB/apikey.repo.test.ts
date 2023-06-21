import { suite } from "uvu";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { createInjector, Injector } from "typed-inject";
import { Config } from "../../../src/backbone/config.js";
import { MongoDB } from "../../../src/base/storage/mongo-db.js";
import { ILogger, Logger } from "../../../src/backbone/logger.js";
import { ApikeyEntity, ApikeyRepo, ApikeyRepoCached } from "../../../src/base/storage/apikey.repo.js";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import { random } from "../../../src/util/random.util.js";
import sinon from "sinon";
import * as a from "uvu/assert";
import { TableListCache } from "../../../src/util/cache.util.js";
import { thrown } from "../../support/thrown.support.js";

type Dependencies = {
  config: Config;
  mongoDB: MongoDB;
  logger: ILogger;
  apikeyRepo: ApikeyRepoCached
}

const test = suite("INTEGRATION DB: apikey repo");

let context: Injector<Dependencies>;

test.before(async () => {
  const generalConfig = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: generalConfig, override: true });
  const specificConfig = new URL("./dbconfig.env", import.meta.url);
  configDotEnv({ path: specificConfig, override: true });
  context = createInjector()
    .provideClass("config", Config)
    .provideClass("mongoDB", MongoDB)
    .provideClass("logger", Logger)
    .provideClass("apikeyRepo", ApikeyRepoCached);
  const repo = context.resolve("apikeyRepo");
  const cache = repo["cache"];
  const accountId = ethereumSupport.info.ethereum.accountId;
  const found = await repo.find({ accountId });
  if (found) await repo.delete({ accountId });
  if (cache) cache.clear();
});

test.after.each(async () => {
  sinon.restore();
});

test.after(async () => {
  await context.dispose();
});

test("should create apikey entity", async () => {
  const apikeyRepo = context.resolve("apikeyRepo");
  const accountId = ethereumSupport.info.ethereum.accountId;
  await apikeyRepo.create({ accountId, reqCount: 0 });
  const errOn2Create = await thrown(() => apikeyRepo.create({ accountId, reqCount: 1 }));
  a.is(errOn2Create, true, "error has to be rise on second create");
  await apikeyRepo.delete({ accountId });
});

test("should create and find api key entity", async () => {
  const apikeyRepo = context.resolve("apikeyRepo");
  const cache = apikeyRepo["cache"];
  const decoratedRepo = apikeyRepo["apikeyRepo"];
  const decoratedRepoSpy = sinon.spy<ApikeyRepo>(decoratedRepo);
  const cacheSpy = sinon.spy<TableListCache<ApikeyEntity> | undefined>(cache);
  const accountId = ethereumSupport.info.ethereum.accountId;
  const created = await apikeyRepo.create({
    accountId: accountId,
    secretSalt: random.string(27),
    apikeySalt: random.string(27),
    reqCount: 0
  });
  const found = await apikeyRepo.find({ accountId: created.accountId });
  a.is(
    found?.accountId, accountId,
    "found account id not matched"
  );
  a.is(
    cacheSpy?.find?.calledOnce, true,
    "cache find method not invoked once"
  );
  a.is(
    cacheSpy?.push?.calledOnce, true,
    "cache push method not invoked once"
  );
  a.is(
    decoratedRepoSpy?.find?.calledOnce, true,
    "decorated apikey repo find method not invoke once"
  );
  const found2 = await apikeyRepo.find({ accountId: created.accountId });
  a.is(found2?.accountId, accountId, "found 2 account id not matched");
  a.is(
    decoratedRepoSpy?.find?.calledOnce, true,
    "decorated apikey repo find not invoked once"
  );
  a.is(
    cacheSpy?.find?.callCount, 2,
    "cache not worked on second find"
  );
  const deletedId = await apikeyRepo.delete({ accountId });
  a.is(deletedId, accountId, "deleted id not matched");
  a.is(cacheSpy?.delete.calledOnce, true, "cache delete method not invoked");
});

test("should create and update api key entity", async () => {
  const apikeyRepo = context.resolve("apikeyRepo");
  const cacheSpy = sinon.spy(apikeyRepo["cache"]);
  const decoratedSpy = sinon.spy(apikeyRepo["apikeyRepo"]);

  const apikeySalt = random.string(27);
  const secretSalt = random.string(27);

  const accountId = ethereumSupport.info.ethereum.accountId;
  const created = await apikeyRepo.create({
    accountId: accountId,
    reqCount: 0
  });
  a.is(created.accountId, accountId, "created apikey account id not matched");
  a.is(created.reqCount, 0, "created apikey reqCount not matched");
  a.is(
    decoratedSpy?.create?.callCount, 1,
    "decorated apikey repo method create not invoked after create"
  );
  a.is(cacheSpy?.push?.callCount, 0, "cache method push invoked on create");
  a.is(cacheSpy?.find?.callCount, 0, "cache method find invoked on create");

  const updated = await apikeyRepo.update({ accountId }, {
    apikeySalt,
    secretSalt
  });
  a.is(updated.accountId, accountId, "updated account id not matched");
  a.is(updated.reqCount, 0, "updated reqCount not matched");
  a.is(updated?.apikeySalt, apikeySalt, "updated apikeySalt not matched");
  a.is(updated?.secretSalt, secretSalt, "updated apikeySalt not matched");
  a.is(
    decoratedSpy?.update?.callCount, 1,
    "decorated apikey repo method update not invoked"
  );
  a.is(
    cacheSpy?.push?.callCount, 1,
    "updated apikey not cached after update"
  );
  const found = await apikeyRepo.find({ accountId });
  a.is(found?.accountId, accountId, "updated account id not matched");
  a.is(found?.reqCount, 0, "updated reqCount not matched");
  a.is(found?.apikeySalt, apikeySalt, "updated apikeySalt not matched");
  a.is(found?.secretSalt, secretSalt, "updated apikeySalt not matched");
  a.is(
    decoratedSpy?.find?.callCount, 0,
    "decorated apikey repo method find invoked, not cached"
  );
  a.is(
    cacheSpy?.find?.returnValues[0]?.accountId, accountId,
    "find from cached not worked"
  );
  cacheSpy?.clear();
  const cleanFound = await apikeyRepo.find({ accountId }); // find after cleaning cache
  a.is(cleanFound?.accountId, accountId, "clean found account id not matched");
  a.is(cleanFound?.reqCount, 0, "clean found reqCount not matched");
  a.is(cleanFound?.apikeySalt, apikeySalt, "clean found apikeySalt not matched");
  a.is(cleanFound?.secretSalt, secretSalt, "clean found apikeySalt not matched");
  a.is(
    decoratedSpy?.find?.callCount, 1,
    "decorated apikey repo method find has to be invoked after clean cache"
  );
  a.not.ok(
    cacheSpy?.find?.returnValues[1],
    "cache method find has not to find apikey entity after clean cache"
  );
  const updated2 = await apikeyRepo.update({ accountId }, { reqCount: 1 });
  a.is(updated2?.accountId, accountId, "2nd update account id not matched");
  a.is(updated2?.reqCount, 1, "2nd update reqCount not matched");
  a.is(updated2?.apikeySalt, apikeySalt, "2nd update apikeySalt not matched");
  a.is(updated2?.secretSalt, secretSalt, "2nd update apikeySalt not matched");

  const fromCache = cacheSpy?.find(accountId);
  a.is(fromCache?.accountId, accountId, "from cache account id not matched");
  a.is(fromCache?.reqCount, 1, "from cache reqCount not matched");
  a.is(fromCache?.apikeySalt, apikeySalt, "from cache apikeySalt not matched");
  a.is(fromCache?.secretSalt, secretSalt, "from cache  apikeySalt not matched");
  await apikeyRepo.delete({ accountId });
  a.not.ok(cacheSpy?.find(accountId), "not delete apikey entity from cache");
});

test.run();
