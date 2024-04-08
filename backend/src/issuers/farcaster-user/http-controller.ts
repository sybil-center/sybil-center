import { IHttpIssuerController } from "../../types/issuer.js";
import { PassportCredential } from "../../services/sybiljs/passport/types.js";
import { FastifyRequest } from "fastify";
import { CanIssue, CanIssueReq, ChallengeReq, IEC, Info, IssueReq } from "@zcredjs/core";
import { tokens } from "typed-inject";
import { FarcasterUserIssuer } from "./issuer.js";
import { IssuerException } from "../../backbone/errors.js";
import { ILogger } from "../../backbone/logger.js";
import { FarcasterUserCred } from "./types.js";

export type FarcasterUserHttpIssuerController = HttpIssuerController;

export class HttpIssuerController
  implements IHttpIssuerController<FarcasterUserCred> {

  static inject = tokens("logger", "farcasterUserIssuer");
  constructor(
    logger: ILogger,
    private readonly issuer: FarcasterUserIssuer
  ) {
    logger.info(`HTTP issuer controller ${issuer.id} initialized`);
  }

  get id(): string {
    return this.issuer.id;
  }

  onGetInfo(): Promise<Info> {
    return this.issuer.getInfo();
  }

  onGetChallenge(req: FastifyRequest<{ Body: ChallengeReq }>) {
    return this.issuer.getChallenge(req.body);
  }

  onCanIssue(req: FastifyRequest<{ Body: CanIssueReq }>): Promise<CanIssue> {
    return this.issuer.canIssue(req.body);
  }

  onIssue(req: FastifyRequest<{ Body: IssueReq }>): Promise<FarcasterUserCred> {
    return this.issuer.issue(req.body);
  }

  onUpdateProofs(_: FastifyRequest<{ Body: PassportCredential }>): Promise<PassportCredential> {
    throw new IssuerException({
      code: IEC.UPDATE_PROOFS_BAD_REQ,
      msg: `"${this.issuer.id}" issuer not provide update proofs method`
    });
  }
}

