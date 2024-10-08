import { ethers, Wallet } from "ethers";
import { Proposal } from "../../src/types/index.js";
import * as o1js from "o1js";
import { ZkProgramInputTransformer, ZkProgramTranslator } from "@jaljs/o1js";
import { O1TrGraph } from "o1js-trgraph";
import vm from "node:vm";
import { ProgramInitResult } from "../../src/services/o1js-proof-verifier.js";
import { SybilPassportEth } from "./credentials.js";
import { createClientSiwe } from "./siwe.js";
import { TestHttpClient } from "./http-client.js";
import { createClientJWS } from "./jws.js";

export const TEST_ROOT_DIR = new URL("../", import.meta.url);
export const PATH_TO_CONFIG = new URL("../config/valid.env", import.meta.url);

const ethPrivateKey = "5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9";
const ethWallet = new ethers.Wallet(ethPrivateKey);

const o1jsTrgraph = new O1TrGraph(o1js);
const o1jsZkInputTransformer = new ZkProgramInputTransformer(o1js);

async function initO1JSZkProgram(program: Proposal["program"]) {
  const translator = new ZkProgramTranslator(o1js, "commonjs");
  const programCode = translator.translate(program);
  const module = new vm.Script(programCode).runInThisContext();
  const { zkProgram, PublicInput } = (await module.initialize(o1js) as ProgramInitResult);
  const { verificationKey } = await zkProgram.compile();
  return {
    zkProgram,
    PublicInput,
    verificationKey
  };
}

export const testUtil = {
  ethereum: {
    address: ethWallet.address,
    privateKey: ethPrivateKey,
    publicKey: ethWallet.getAddress(),
    signMessage: (message: Parameters<Wallet["signMessage"]>[0]) => ethWallet.signMessage(message),
    wallet: ethWallet,
    stringZcredId: `ethereum:address:${ethWallet.address.toLowerCase()}`,
    zcredId: {
      type: "ethereum:address",
      key: ethWallet.address.toLowerCase()
    }
  },
  o1js: {
    trgraph: o1jsTrgraph,
    zkInputTransformer: o1jsZkInputTransformer,
    initZkProgram: initO1JSZkProgram
  },
  creds: { SybilPassportEth },
  createClientSiwe: createClientSiwe,
  HttpClient: TestHttpClient,
  createClientJWS: createClientJWS
};