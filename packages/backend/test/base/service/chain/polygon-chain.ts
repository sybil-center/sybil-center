import { suite } from "uvu";
import * as assert from "uvu/assert";
import { PolygonSignService } from "../../../../src/base/service/sign/polygon-sign.service.js";
import { ethereumSupport } from "../../../support/ethereum.js";

const test = suite("Polygon sign test");

const polygonChain = new PolygonSignService();

const { address, didPkhPrefix } = ethereumSupport.info.polygon;
const message = "test";
const signature = await ethereumSupport.sign(message);

test("should correct verify message", async () => {
  await polygonChain.verifySign(signature, message, address);
});

test("should correct get did-pkh", async () => {
  const didPkh = await polygonChain.did(signature, message, address);
  assert.is(didPkh, `${didPkhPrefix}:${address}`);
});

test.run();
