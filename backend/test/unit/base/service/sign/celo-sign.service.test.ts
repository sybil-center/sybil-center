import { suite } from "uvu";
import * as assert from "uvu/assert";
import { CeloSignService } from "../../../../../src/base/service/sign/celo-sign.service.js";
import { ethereumSupport } from "../../../../support/chain/ethereum.js";

const test = suite("UNIT: celo sign test");

const celoChain = new CeloSignService();

const { didPkhPrefix, address } = ethereumSupport.info.celo;

const message = "test";

const signature = await ethereumSupport.sign(message);

test("should correct verify message", async () => {
  await celoChain.verify({ signature, message, address });
});

test("should correct get did pkh", async () => {
  const didPkh = await celoChain.did({ signature, message, address });
  assert.is(didPkh, `${didPkhPrefix}:${address}`, "did-pkh is not matched");
});

test.run();
