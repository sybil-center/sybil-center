import * as t from "io-ts";
import { ChallengeReq as OriginChallengeReq } from "@sybil-center/sdk/types";

export const rawChallengeReqAsChallengeReq = new t.Type<
  OriginChallengeReq,
  OriginChallengeReq,
  any
>(
  "RawChallengeReq-as-ChallengeReq",
  (input: any): input is OriginChallengeReq => {
    return input?.expirationDate !== null && (
        typeof input?.expirationDate === "undefined" ||
        typeof input?.expirationDate === "object"
      );
  },
  (rawChallengeReq: any, context) => {
    try {
      const expirationDate = rawChallengeReq.expirationDate;
      rawChallengeReq.expirationDate = expirationDate
        ? new Date(expirationDate)
        : undefined;
      return t.success(rawChallengeReq as OriginChallengeReq);
    } catch (e) {
      return t.failure(rawChallengeReq, context, String(e));
    }
  },
  (challengeReq: OriginChallengeReq) => challengeReq
);

export const ChallengeReq = t.any.pipe(rawChallengeReqAsChallengeReq);

export type ChallengeReq = t.TypeOf<typeof ChallengeReq>

