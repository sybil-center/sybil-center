import { IHttpIssuerController } from "../../types/issuer.js";
import { PassportCredential } from "../../services/sybiljs/passport/types.js";
import { FastifyRequest } from "fastify";
import { CanIssue, CanIssueReq, ChallengeReq, IEC, Info, IssueReq } from "@zcredjs/core";
import { tokens } from "typed-inject";
import { Issuer as PassportIssuer } from "./issuer.js";
import { IssuerException } from "../../backbone/errors.js";
import { ILogger } from "../../backbone/logger.js";

export type PassportHttpIssuerController = HttpIssuerController;

export class HttpIssuerController
  implements IHttpIssuerController<PassportCredential> {

  static inject = tokens("logger", "passportIssuer");
  constructor(
    logger: ILogger,
    private readonly passportIssuer: PassportIssuer
  ) {
    logger.info(`HTTP issuer controller "passport" initialized`);
  }

  id = "passport";

  onGetInfo(): Promise<Info> {
    return this.passportIssuer.getInfo();
  }

  onGetChallenge(req: FastifyRequest<{ Body: ChallengeReq }>) {
    return this.passportIssuer.getChallenge(req.body);
  }

  onCanIssue(req: FastifyRequest<{ Body: CanIssueReq }>): Promise<CanIssue> {
    return this.passportIssuer.canIssue(req.body);
  }

  onIssue(req: FastifyRequest<{ Body: IssueReq }>): Promise<PassportCredential> {
    return this.passportIssuer.issue(req.body);
  }

  onUpdateProofs(_: FastifyRequest<{ Body: PassportCredential }>): Promise<PassportCredential> {
    throw new IssuerException({
      code: IEC.UPDATE_PROOFS_BAD_REQ,
      msg: `"passport" issuer not provide update proofs method`
    });
  }
}

