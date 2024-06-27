import { suite } from "uvu";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../test-util/index.js";
import { App } from "../../../../src/app.js";
import { ClientService } from "../../../../src/services/client-service.js";
import * as a from "uvu/assert";

const test = suite("Client Service tests");

let app: App;
let clientService: ClientService;


test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = (await App.init());
  clientService = app.context.resolve("clientService");
});

test.after(async () => {
  while (!app) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await app.close();
});

test("generate access token", async () => {
  const accessToken = clientService["generateAccessToken"]();
  a.ok(
    new Uint8Array(Buffer.from(accessToken, "hex")).length === 16,
    "access token has invalid length (16 bytes; 32 hex chars)"
  );
  a.ok(clientService.isAccessToken(accessToken), "incorrect generated access token");
});

test.run();