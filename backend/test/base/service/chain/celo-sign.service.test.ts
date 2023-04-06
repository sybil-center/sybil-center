import { suite } from "uvu";
import * as assert from "uvu/assert";
import { CeloSignService } from "../../../../src/base/service/sign/celo-sign.service.js";
import { ethereumSupport } from "../../../test-support/ethereum.js";

const test = suite("Celo sign test");

const celoChain = new CeloSignService();

const { didPkhPrefix, address } = ethereumSupport.info.celo;

const message = "test";

const signature = await ethereumSupport.sign(message);

test("should correct verify message", async () => {
  await celoChain.verifySign(signature, message, address);
});

test("should correct get did pkh", async () => {
  const didPkh = await celoChain.did(signature, message, address);
  assert.is(didPkh, `${didPkhPrefix}:${address}`, "did-pkh is not matched");
});

test.run();
