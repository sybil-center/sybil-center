import { suite } from "uvu";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { createInjector, Injector } from "typed-inject";
import { Config } from "../../../src/backbone/config.js";
import { ClientEntity, ClientRepo, IClientRepo } from "../../../src/base/storage/client.repo.js";
import { MongoDB } from "../../../src/base/storage/mongo-db.js";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import * as a from "uvu/assert";
import { Logger } from "../../../src/backbone/logger.js";
import { thrown } from "../../support/thrown.support.js";

const test = suite("INTEGRATION DB: client repo");

type Dependencies = {
  config: Config,
  mongoDB: MongoDB,
  clientRepo: IClientRepo
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
    .provideClass("clientRepo", ClientRepo);
  const db = context.resolve("mongoDB");
  const clients = db.collection<ClientEntity>("clients");
  await clients.deleteMany({});
});

test.after(async () => {
  await context.dispose();
});

test("should create and delete client", async () => {
  const clientRepo = context.resolve("clientRepo");
  const accountId = `eip155:1:${ethereumSupport.info.ethereum.address}`;
  const created = await clientRepo.create({
    accountId: accountId,
    restrictionURIs: [],
    customSchemas: []
  });
  a.is(accountId, created.accountId, "created account id not matched");
  const deletedAccountId = await clientRepo.delete({ accountId });
  a.is(accountId, deletedAccountId, "deleted account id not matched");
});

test("should create and find client", async () => {
  const clientRepo = context.resolve("clientRepo");
  const accountId = `eip155:1:${ethereumSupport.info.ethereum.address}`;
  const restrictionURIs = ["https://example.com", "https://www.example.com"];
  const customSchemas = [{
    properties: {
      name: { type: "string", nullable: false }
    }
  }];
  const created = await clientRepo.create({
    accountId: accountId,
    restrictionURIs: restrictionURIs,
    customSchemas: customSchemas
  });
  a.is(created.accountId, accountId, "created account id not matched");
  const client = await clientRepo.get({ accountId });
  a.is(client.accountId, accountId, "founded account id not matched");
  a.is(client.restrictionURIs.includes(restrictionURIs[0]!), true,);
  a.is(client.restrictionURIs.includes(restrictionURIs[1]!), true);
  const schemaProps = client.customSchemas[0]!.properties;
  a.is(
    schemaProps.name.type, "string",
    "custom schema property name type not matched"
  );
  a.is(
    schemaProps.name.nullable, false,
    "custom schema property name nullable not matched"
  );
  const deletedAccountId = await clientRepo.delete({ accountId });
  a.is(deletedAccountId, accountId, "deleted account id not matched");
});

test("should find client if exists & not find otherwise", async () => {
  const clientRepo = context.resolve("clientRepo");
  const accountId = `eip155:1:${ethereumSupport.info.ethereum.address}`;
  const created = await clientRepo.create({
    accountId: accountId,
    restrictionURIs: [],
    customSchemas: []
  });
  a.is(accountId, created.accountId, "created account id not matched");
  const client = await clientRepo.find({ accountId });
  a.ok(client);
  a.is(client?.accountId, accountId, "found account id is not match");
  const deletedAccountId = await clientRepo.delete({ accountId });
  a.is(deletedAccountId, accountId, `deleted account id not matched`);
  const emptyClient = await clientRepo.find({ accountId: deletedAccountId });
  a.not.ok(emptyClient);
});

test("should throw on second create", async () => {
  const clientRepo = context.resolve("clientRepo");
  const client: ClientEntity = {
    accountId: ethereumSupport.info.ethereum.accountId,
    restrictionURIs: ["example.com"],
    customSchemas: [{ properties: { name: { type: "string" } } }]
  };
  const created = await clientRepo.create(client);
  a.equal(created, client, "created client not matched with expected client");
  const isThrown = await thrown(() => clientRepo.create(client));
  a.is(isThrown, true, "not throw err on second create");
  await clientRepo.delete({ accountId: client.accountId });
});

test.run();
