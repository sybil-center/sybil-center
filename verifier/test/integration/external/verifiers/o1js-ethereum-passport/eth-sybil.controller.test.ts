import { suite } from "uvu";
import { EthSybilStore } from "../../../../../src/stores/eth-sybil.store.js";
import { App } from "../../../../../src/app.js";
import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../../test-util/index.js";
import sinon from "sinon";
import crypto from "node:crypto";
import { ethers, hexlify } from "ethers";
import { EthSybilEntity } from "../../../../../src/models/entities/eth-sybil.entity.js";
import * as a from "uvu/assert";

const test = suite("Ethereum Sybil controller tests");

let app: App;
let ethSybilStore: EthSybilStore;
let fastify: FastifyInstance;

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  ethSybilStore = app.context.resolve("ethSybilStore");
});

test.after(async () => {
  await app.close();
});

test("Get eth-sybil data", async () => {
  const sandbox = sinon.createSandbox();
  const address = ethers.Wallet.createRandom().address.toLowerCase();
  const ethSybilEntity: EthSybilEntity = {
    id: crypto.randomUUID(),
    address: address,
    sybilId: hexlify(new Uint8Array(20).fill(10)),
    createdAt: new Date(),
    updatedAt: new Date(),
    signature: hexlify(new Uint8Array(65).fill(2))
  };
  const otherAddress = ethers.Wallet.createRandom().address;
  sandbox.stub(ethSybilStore, "getByAddress")
    .withArgs(address)
    .resolves(ethSybilEntity)
    .withArgs(otherAddress)
    .resolves(undefined);

  const ethSybilResp = await fastify.inject({
    method: "GET",
    url: `/api/eth-sybil/${address}`
  });
  a.is(ethSybilResp.statusCode, 200, "eth sybil response status code is not 200");
  const foundEthSybilEntity: EthSybilEntity = JSON.parse(ethSybilResp.body);
  a.equal({
    sybilId: ethSybilEntity.sybilId,
    address: ethSybilEntity.address,
    signature: ethSybilEntity.signature
  }, foundEthSybilEntity, "2");
  const failEthSybilResp = await fastify.inject({
    method: "GET",
    url: `/api/eth-sybil/${otherAddress}`
  });
  a.is(failEthSybilResp.statusCode, 404, "3");
  const failBody: { message: string } = JSON.parse(failEthSybilResp.body);
  a.ok("message" in failBody && typeof failBody.message === "string", "4");
  sandbox.restore();
});

// test.run();