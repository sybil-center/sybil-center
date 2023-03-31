import { suite } from "uvu";
import * as assert from "uvu/assert";
import { EthereumSignService } from "../../../../src/base/service/sign/ethereum-sign.service.js";
import { ethereumSupport } from "../../../support/ethereum.js";

const test = suite("Ethereum sign test");

const ethereumChain = new EthereumSignService();
const { address, didPkhPrefix } = ethereumSupport.info.ethereum;
const message = "test";
const signature = await ethereumSupport.sign(message);

test("should verify signature", async () => {
  await ethereumChain.verifySign(signature, message, address);
});

test("should correct get did-pkh", async () => {
  const didPkh = await ethereumChain.did(signature, message, address);
  assert.is(didPkh, `${didPkhPrefix}:${address}`, "did-pkh is not matched");
});

test.run();
