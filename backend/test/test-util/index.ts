import { bitcoinTestUtil } from "./chain/bitcoin.js";
import { celoTestUtil, ethereumTestUtil, polygonTestUtil } from "./chain/ethereum.js";
import { minaTestUtil } from "./chain/mina.js";
import { solanaTestUtil } from "./chain/solana.js";

export const testUtil = {
  envPath: new URL(`../env-config/test.env`, import.meta.url),
  badEnvPath: new URL(`../env-config/invalid-test.env`, import.meta.url),
  bitcoin: bitcoinTestUtil,
  ethereum: ethereumTestUtil,
  celo: celoTestUtil,
  polygon: polygonTestUtil,
  mina: minaTestUtil,
  solana: solanaTestUtil
};
