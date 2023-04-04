import { suite } from "uvu";
import * as a from "uvu/assert";
import sinon from "sinon";
import { ethers } from "ethers";
import { EthService } from "../../src/base/service/eth-service.js";
const BigNumber = ethers.BigNumber
const test = suite("Ethereum service test");

test.after.each(async () => {
  sinon.restore();
});

test("should find ethereum account", async () => {
  const provider = new ethers.providers.JsonRpcProvider("https://example.com");
  sinon.stub(provider, "getBalance").onFirstCall().resolves(BigNumber.from(123));

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

// EthServiceTest.run(); //TODO change
