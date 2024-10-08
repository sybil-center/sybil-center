import { suite } from "uvu";
import * as a from "uvu/assert";
import sinon from "sinon";
import ethers from "ethers";
import { EthService } from "../../../src/services/eth.service.js";

const test = suite("UNIT: ethereum service test");

test.after.each(async () => {
  await sinon.restore();
});

test("should find ethereum account", async () => {
  const provider = new ethers.providers.JsonRpcProvider("https://example.com");
  sinon.stub(provider, "getBalance").onFirstCall().resolves(ethers.BigNumber.from(123));

  const ethService = new EthService({ ethNodeUrl: "" }, provider);
  const isExist = await ethService.isAddressExist("test");
  a.is(isExist, true);
});

test("should not find ethereum account", async () => {
  const provider = new ethers.providers.JsonRpcProvider("https://example.com");
  sinon.stub(provider, "getBalance").onFirstCall().throws(new Error());
  const ethService = new EthService({ ethNodeUrl: "" }, provider);
  const isExist = await ethService.isAddressExist("test");

  a.is(isExist, false);
});

// test.run(); TODO find reason why process does not close after test
