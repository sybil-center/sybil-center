import { suite } from "uvu";
import * as a from "uvu/assert";
import { toCredentialType, urlCredentialType } from "@sybil-center/sdk/util";

const test = suite("UNIT: VC Type test");

test("should convert url vc type to VCType enum", async () => {
  const emptyUrlVCType = "ethereum-account";
  const vcType = toCredentialType(emptyUrlVCType);
  a.equal("EthereumAccount", vcType);
});

test("should throw exception because invalid url vc type from", async () => {
  const testUrlForm = "test1234324";
  a.throws(() => toCredentialType(testUrlForm), "should throw error");
});

test("should convert VCType enum to vc type url form", async () => {
  const expVCTypeUrlForm = "ethereum-account";
  const actVCTypeUrlForm = urlCredentialType("EthereumAccount");
  a.is(actVCTypeUrlForm, expVCTypeUrlForm);

  const expEthUrlVCType = "ethereum-account";
  const actEthUrlVCType = urlCredentialType("EthereumAccount");
  a.is(actEthUrlVCType, expEthUrlVCType);
});

test.run();
