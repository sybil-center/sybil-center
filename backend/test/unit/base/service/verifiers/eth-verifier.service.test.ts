import { suite } from "uvu";
import { ethers } from "ethers";
import * as a from "uvu/assert";
import { EthVerifier } from "../../../../../src/base/service/verifiers/eth-verifier.service.js";

const test = suite("UNIT: ethereum signature verifier test");

const verifier = new EthVerifier();

test("verify signature", async () => {
  const message = "hello world";
  const wallet = ethers.Wallet.createRandom();
  const signature = await wallet.signMessage(message);
  const verified = await verifier.verify({
    sign: signature,
    msg: message,
    publickey: wallet.address
  });
  a.is(verified, true, `signature is not verified`);
});

test.run()
