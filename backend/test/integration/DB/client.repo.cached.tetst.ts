import { ClientEntity, ClientRepoCached } from "../../../src/base/storage/client.repo.js";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { Config } from "../../../src/backbone/config.js";
import { ILogger, Logger } from "../../../src/backbone/logger.js";
import { MongoDB } from "../../../src/base/storage/mongo-db.js";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import sinon from "sinon";
import { createInjector, Injector } from "typed-inject";
import { suite } from "uvu";
import * as a from "uvu/assert";

const test = suite("INTEGRATION DB: client repo cached");

type Dependencies = {
  config: Config,
  logger: ILogger,
  mongoDB: MongoDB,
  clientRepo: ClientRepoCached;
}

let context: Injector<Dependencies>;
test.before(async () => {
  const generalConfig = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: generalConfig, override: true });
  const specificConfig = new URL("./dbconfig.env", import.meta.url);
  configDotEnv({ path: specificConfig, override: true });
  context = createInjector()
    .provideClass("config", Config)
    .provideClass("logger", Logger)
    .provideClass("mongoDB", MongoDB)
    .provideClass("clientRepo", ClientRepoCached);
  const db = context.resolve("mongoDB");
  const clients = db.collection<ClientEntity>("clients");
  await clients.deleteMany({});
});

test.after(async () => {
  await context.dispose();
});

test.after.each(() => {
  sinon.restore();
});


test("should create and cache after find", async () => {
  const clientRepo = context.resolve("clientRepo");
  const cacheSpy = sinon.spy(clientRepo["cache"]);
  const decorated = sinon.spy(clientRepo["clientRepo"]);
  const client: ClientEntity = {
    accountId: ethereumSupport.info.ethereum.accountId,
    restrictionURIs: ["example.com"],
    customSchemas: [{ properties: { hello: { type: "string" } } }]
  };
  const created = await clientRepo.create(client);
  a.equal(created, client, "created client not matched with expected client");
  a.is(cacheSpy?.push?.callCount, 0, "cache was used when created");
  a.is(decorated?.create?.callCount, 1, "decorated client repo method wasn't called");

  const found = await clientRepo.find({ accountId: client.accountId });
  a.equal(found, client, "found and created clients not matched");
  a.is(cacheSpy?.find?.callCount, 1, "cache find was not used on repo find");
  a.not.ok(
    cacheSpy?.find?.returnValues[0],
    "firs cache find return something, has to be null or undefined"
  );
  a.is(
    decorated?.find?.callCount, 1,
    "decorated client repo method find was not used on first call"
  );

  const found2 = await clientRepo.find({ accountId: client.accountId });
  a.equal(found2, created, "second found not matched with created");
  a.is(cacheSpy?.find?.callCount, 2, "cache find was not used on second repo find");
  a.equal(
    cacheSpy?.find?.returnValues[1], created,
    "cached find not matched with created on second repo find"
  );
  a.is(
    decorated?.find?.callCount, 1,
    "decorated client repo find method has not to be called on second find"
  );
  await clientRepo.delete({ accountId: client.accountId });
  a.not.ok(cacheSpy?.find(client.accountId));
});

test("should update cache after update", async () => {
  const clientRepo = context.resolve("clientRepo");
  const cacheSpy = sinon.spy(clientRepo["cache"]);
  const decorated = sinon.spy(clientRepo["clientRepo"]);
  const client: ClientEntity = {
    accountId: ethereumSupport.info.ethereum.accountId,
    restrictionURIs: ["example.com"],
    customSchemas: [{ properties: { hello: { type: "string" } } }]
  };
  const restrictionsToUpdate = ["update.com"];
  const schemasToUpdate = [{ properties: { testo: { type: "string" } } }];
  const clientUpdated = {
    accountId: ethereumSupport.info.ethereum.accountId,
    restrictionURIs: restrictionsToUpdate,
    customSchemas: schemasToUpdate
  };
  const created = await clientRepo.create(client);
  a.equal(created, client, "created client not matched with expected client");

  const updated = await clientRepo.update(
    { accountId: client.accountId },
    { restrictionURIs: restrictionsToUpdate, customSchemas: schemasToUpdate }
  );
  //@ts-ignore
  delete updated._id;
  a.equal(updated, clientUpdated, "updated client not matched with expected");
  a.is(cacheSpy?.push?.callCount, 1, "after update client has to be cached");
  a.is(decorated.update?.callCount, 1, "decorated client repo has to call update method");

  const found = await clientRepo.find({ accountId: client.accountId });
  a.equal(found, clientUpdated, "found client not matched with expected client");
  a.is(cacheSpy?.find?.callCount, 1, "cache find method has to be called after find");
  a.equal(
    cacheSpy?.find?.returnValues[0], clientUpdated,
    "cache has to return updated client after call find method"
  );
  a.is(
    decorated.find.callCount, 0,
    "decorated client repo has not to call find method, because cash"
  );
  const deletedAccountId = await clientRepo.delete({ accountId: client.accountId });
  a.is(
    deletedAccountId, client.accountId,
    "deleted account id not matched with expected account id"
  );
  a.not.ok(cacheSpy?.find(deletedAccountId));
});

test.run();
