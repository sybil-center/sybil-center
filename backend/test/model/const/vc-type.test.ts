import { suite } from "uvu";
import * as assert from "uvu/assert";
import {
  toEnumVCType,
  toUrlVCType,
  VCType,
} from "../../../src/base/model/const/vc-type.js";

const test = suite("VC Type test");

test("should convert url vc type to VCType enum", async () => {
  const emptyUrlVCType = "empty";
  const vcType = toEnumVCType(emptyUrlVCType);
  assert.equal(VCType.Empty, vcType);
});

test("should throw exception because invalid url vc type from", async () => {
  const testUrlForm = "test1234324";

  assert.throws(() => toEnumVCType(testUrlForm), "should throw error");
});

test("should convert VCType enum to vc type url form", async () => {
  const expVCTypeUrlForm = "empty";
  const actVCTypeUrlForm = toUrlVCType(VCType.Empty);
  assert.is(actVCTypeUrlForm, expVCTypeUrlForm);

  const expEthUrlVCType = "ethereum-account";
  const actEthUrlVCType = toUrlVCType(VCType.EthereumAccount);
  assert.is(actEthUrlVCType, expEthUrlVCType);
});

test.run();
