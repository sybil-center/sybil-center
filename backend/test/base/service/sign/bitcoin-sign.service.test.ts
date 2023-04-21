import { suite } from "uvu";
import * as assert from "uvu/assert";
import { BitcoinSignService } from "../../../../src/base/service/sign/bitcoin-sign.service.js";
import { bitcoinSupport } from "../../../test-support/chain/bitcoin.js";

const test = suite("Bitcoin sign test");

const bitcoinChain = new BitcoinSignService();
const { didPkhPrefix, address } = bitcoinSupport.info;

const message = "test";
const signature = await bitcoinSupport.sing(message);

test("should correct verify signature", async () => {
  await bitcoinChain.verify({ signature, message, address });
});

test("should correct get did-pkh", async () => {
  const didPkh = await bitcoinChain.did({ signature, message, address });
  assert.is(didPkh, `${didPkhPrefix}:${address}`, "did-pkh is not matched");
});

test.run();
