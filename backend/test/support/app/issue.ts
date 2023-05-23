import { App } from "../../../src/app/app.js";
import { type EthAccountVC } from "@sybil-center/sdk/types";

type Input = {
  subjectId: string;
  signFn: (msg: string) => Promise<string>;
  app: App;
  opt?: { expirationDate?: Date }
}

export async function issueEthAccountVC(input: Input): Promise<EthAccountVC> {
  const issuer = input.app.context.resolve("ethereumAccountIssuer");
  const { sessionId, issueMessage } = await issuer.getChallenge({
    subjectId: input.subjectId,
    expirationDate: input.opt?.expirationDate
  });
  const signature = await input.signFn(issueMessage);
  const credential = await issuer.issue({
    sessionId: sessionId,
    signature: signature
  });
  return credential as EthAccountVC;
}
