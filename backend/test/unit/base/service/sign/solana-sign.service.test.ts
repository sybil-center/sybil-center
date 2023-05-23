import { suite } from "uvu";
import * as assert from "uvu/assert";
import { SolanaSignService } from "../../../../../src/base/service/sign/solana-sign.service.js";
import { solanaSupport } from "../../../../support/chain/solana.js";

const test = suite("UNIT: solana sign test");

const solanaChain = new SolanaSignService();

const { didPkhPrefix, address } = solanaSupport.info;
const message = "test";
const signature = await solanaSupport.sign(message);

test("should correct verify signature and get did pkh", async () => {
  await solanaChain.verify({ signature, message, address });
});

test("should correct get did-pkh", async () => {
  const didPkh = await solanaChain.did({ signature, message, address });
  assert.is(didPkh, `${didPkhPrefix}:${address}`, "did-pkh is not matched");
});

test.run();
