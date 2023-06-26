import { suite } from "uvu";
import { App } from "../../../../../src/app/app.js";
import { configDotEnv } from "../../../../../src/util/dotenv.util.js";
import { appSup } from "../../../../support/app/index.js";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";
import * as a from "uvu/assert";
import { AccountJWT } from "../../../../../src/base/service/jwt.service.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { fromString, toString } from "uint8arrays";

const test = suite("INTEGRATION: jwt service");

let app: App;

test.before(async () => {
  const testConfig = new URL("../../../../env-config/test.env", import.meta.url);
  configDotEnv({ path: testConfig, override: true });
  app = await App.init();
});

test.after(async () => {
  await app.close();
});

const issueCredential = async (): Promise<EthAccountVC> => {
  const { apiKeysCredentialTTL: ttlRange } = app.context.resolve("config");
  const subjectId = ethereumSupport.info.ethereum.didPkh;

  const expDate = new Date();
  expDate.setTime(expDate.getTime() + ttlRange - 100);

  return await appSup.issueEthAccountVC({
    app: app,
    subjectId: subjectId,
    signFn: ethereumSupport.sign,
    opt: {
      expirationDate: expDate
    }
  });
};

test("should generate & verify jwt token from credential", async () => {
  const jwtService = app.context.resolve("jwtService");
  const subjectId = ethereumSupport.info.ethereum.didPkh;
  const credential = await issueCredential();
  const token = await jwtService.toAccountJWT(credential);
  const payload = jwtService.verifyToken<AccountJWT>(token);
  const accountId = subjectId.split(":").slice(2).join("");
  a.is(accountId, payload.accountId, "account id from not matched");
});

test("should throw error because invalid JWT", async () => {
  const jwtService = app.context.resolve("jwtService");
  const invalidPayload = { accountId: "invalid:account:id" };
  const jwtInvalidPayload = toString(fromString(JSON.stringify(invalidPayload), "utf8"), "base64url");
  const credential = await issueCredential();
  const token = await jwtService.toAccountJWT(credential);
  const [jwtHeader, _, jwtSign] = token.split(".");
  const invalidToken = `${jwtHeader}.${jwtInvalidPayload}.${jwtSign}`;
  let thrown = false;
  try {
    jwtService.verifyToken(invalidToken);
  } catch (e) { thrown = true; }
  a.is(thrown, true, "JWT service have to throw error when invalid token handled");
});

test.run();
