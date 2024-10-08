import { ChallengeReq } from "@zcredjs/core";
import crypto from "node:crypto";

type Args = {
  desc: string;
  challengeReq: ChallengeReq;
  issuerDomain: string;
}

export function getSignMessage({
  desc,
  challengeReq,
  issuerDomain
}: Args): string {
  const nonce = crypto.randomUUID();
  const result = [
    `Description: \n${desc}`,
    `Address type: \n${challengeReq.subject.id.type}`,
    `Address: \n${challengeReq.subject.id.key}`,
    `Issuer: \n${issuerDomain}`
  ];
  if (challengeReq.validFrom) {
    result.push(`Valid from: \n${challengeReq.validFrom}`);
  }
  if (challengeReq.validUntil) {
    result.push(`Valid util: \n${challengeReq.validUntil}`);
  }
  result.push(`nonce: \n${nonce}`);
  return result.join(`\n\n`);
}
