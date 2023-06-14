import { suite } from "uvu";
import { configDotEnv } from "../../../src/util/dotenv.util.js";
import { createInjector, Injector } from "typed-inject";
import { Config } from "../../../src/backbone/config.js";
import { ClientRepo, IClientRepo } from "../../../src/base/storage/client-repo.js";
import { MongoDB } from "../../../src/base/storage/mongo-db.js";
import { ethereumSupport } from "../../support/chain/ethereum.js";
import * as a from "uvu/assert";

const test = suite("INTEGRATION DB: client repo");

let context: Injector<{
  config: Config,
  mongoDB: MongoDB,
  clientRepo: IClientRepo
}>;

test.before(async () => {
  const generalConfig = new URL("../../env-config/test.env", import.meta.url);
  configDotEnv({ path: generalConfig, override: true });
  const specificConfig = new URL("./dbconfig.env", import.meta.url);
  configDotEnv({ path: specificConfig, override: true });
  context = createInjector()
    .provideClass("config", Config)
    .provideClass("mongoDB", MongoDB)
    .provideClass("clientRepo", ClientRepo);
});

test.after(async () => {
  await context.dispose();
});

test("should create and delete client", async () => {
  const clientRepo = context.resolve("clientRepo");
  const accountId = `eip155:1:${ethereumSupport.info.ethereum.address}`;
  const createdAccountId = await clientRepo.updateOrCreate({ accountId }, {
    restrictionURIs: [],
    customSchemas: []
  });
  a.is(accountId, createdAccountId, "created account id not matched");

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
  const createdAccountId = await clientRepo.updateOrCreate({ accountId }, {
    restrictionURIs: restrictionURIs,
    customSchemas: customSchemas
  });
  a.is(accountId, createdAccountId, "created account id not matched");

  const client = await clientRepo.get({ accountId });
  a.is(accountId, client.accountId, "founded account id not matched");
  a.is(true, client.restrictionURIs.includes(restrictionURIs[0]!));
  a.is(true, client.restrictionURIs.includes(restrictionURIs[1]!));
  const schemaProps = client.customSchemas[0]!.properties;
  a.is("string", schemaProps.name.type, "custom schema property name type not matched");
  a.is(false, schemaProps.name.nullable, "custom schema property name nullable not matched");
  const deletedAccountId = await clientRepo.delete({ accountId });
  a.is(accountId, deletedAccountId, "deleted account id not matched");
});

test("should find client if exists & not find otherwise", async () => {
  const clientRepo = context.resolve("clientRepo");
  const accountId = `eip155:1:${ethereumSupport.info.ethereum.address}`;
  const createdAccountId = await clientRepo.updateOrCreate({ accountId }, {
    restrictionURIs: [],
    customSchemas: []
  });
  a.is(createdAccountId, accountId, "created account id not matched");
  const client = await clientRepo.find({ accountId });
  a.ok(client);
  a.is(accountId, client!.accountId, "found account id is not match")
  ;
  const deletedAccountId = await clientRepo.delete({ accountId });
  a.is(deletedAccountId, accountId, `deleted account id not matched`);

  const emptyClient = await clientRepo.find({ accountId });
  a.ok(!emptyClient);
});

test.run();
