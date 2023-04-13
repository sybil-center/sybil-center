import { App } from "../../../src/app/app.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { ethereumSupport } from "../chain/ethereum.js";

export async function apiKeys(
  app: App
): Promise<APIKeys> {
  const { address: publicId } = ethereumSupport.info.ethereum;
  const apiKeyService = app.context.resolve("apiKeyService");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 3);
  const issuer = app.context.resolve("ethereumAccountIssuer");
  const {sessionId, issueChallenge} = await issuer.getChallenge({
    publicId: publicId,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueChallenge);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature,
    signType: "eip155:1"
  }) as EthAccountVC;
  return await apiKeyService.generate(credential);;

}
