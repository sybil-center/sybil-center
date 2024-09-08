import { VERIFIER_STATEMENT } from "../../src/consts/index.js";
import siwe from "siwe";
import { testUtil } from "./index.js";

export async function createClientSiwe(input: {
  statement: typeof VERIFIER_STATEMENT[keyof typeof VERIFIER_STATEMENT];
  origin: string;
}) {
  const { statement, origin } = input;
  const hostnameSplit = new URL(origin).hostname.split(".");
  const domain = [
    hostnameSplit[hostnameSplit.length - 2],
    hostnameSplit[hostnameSplit.length - 1]
  ].join(".");
  const siweMessage = new siwe.SiweMessage({
    domain: domain,
    uri: origin,
    address: testUtil.ethereum.address,
    statement: statement,
    nonce: siwe.generateNonce(),
    version: "1",
    chainId: 1,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(new Date().getTime() + 100 * 1000).toISOString()
  }).toMessage();
  const signature = await testUtil.ethereum.signMessage(siweMessage);
  return { message: siweMessage, signature };
}