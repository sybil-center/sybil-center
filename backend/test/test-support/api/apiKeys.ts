import { App } from "../../../src/app/app.js";
import { EthAccountVC } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { ethereumSupport } from "../chain/ethereum.js";

export async function apiKeys(
  app: App
): Promise<APIKeys> {
  const { didPkh } = ethereumSupport.info.ethereum;
  const apiKeyService = app.context.resolve("apiKeyService");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 3);
  const issuer = app.context.resolve("ethereumAccountIssuer");
  const {sessionId, issueMessage} = await issuer.getChallenge({
    subjectId: didPkh,
    expirationDate: expirationDate
  });
  const signature = await ethereumSupport.sign(issueMessage);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature,
  }) as EthAccountVC;
  return await apiKeyService.generate(credential);;

}
