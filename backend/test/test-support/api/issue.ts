import { App } from "../../../src/app/app.js";
import { challengeEP, issueEP } from "@sybil-center/sdk/util";
import { Challenge, EthAccountVC } from "@sybil-center/sdk/types";
import * as a from "uvu/assert";

export async function issueEthAccountVC(
  subjectId: string,
  signFn: (msg: string) => Promise<string>,
  app: App,
  opt?: {expirationDate?: Date}
): Promise<EthAccountVC> {
  const fastify = app.context.resolve("httpServer").fastify;
  const frontendOrigin = app.context.resolve("config").frontendOrigin.origin;
  const challengeResp = await fastify.inject({
    method: "POST",
    url: challengeEP("EthereumAccount"),
    headers: {
      "Referer": frontendOrigin
    },
    payload: {
      subjectId: subjectId,
      expirationDate: opt?.expirationDate
    }
  });
  a.is(
    challengeResp.statusCode, 200,
    `challenge response fail. error: ${challengeResp.body}`
  );
  const { sessionId, issueChallenge} = JSON.parse(challengeResp.body) as Challenge;
  const signature = await signFn(issueChallenge);
  const issueResp = await fastify.inject({
    method: "POST",
    url: issueEP("EthereumAccount"),
    headers: {
      "Referer": frontendOrigin
    },
    payload: {
      sessionId: sessionId,
      signature: signature,
    }
  });
  a.is(
    issueResp.statusCode, 200,
    `issue response fail. error: ${issueResp.statusCode}`
  );
  return JSON.parse(issueResp.body);

}
