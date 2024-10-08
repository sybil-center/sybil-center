import {
  type CanIssue,
  type CanIssueReq,
  type Challenge,
  type ChallengeReq,
  HttpCredential,
  type IHttpIssuer as IHttpIssuerOrigin,
  type Info,
  IssueReq
} from "@zcredjs/core";
import { type Disposable } from "typed-inject";
import { FastifyRequest } from "fastify";
import { IWebhookHandler } from "../services/types/webhook-handler.js";

export interface IIssuer<
  TCred extends HttpCredential = HttpCredential
> extends IHttpIssuerOrigin<TCred>,
  Partial<Disposable>,
  Partial<IWebhookHandler> {
  id: string;
}

export type IssuerModule = {
  Issuer: {
    new(...args: any[]): IIssuer
    init?: () => Promise<IIssuer>
  }
}

export interface IHttpIssuerController<
  TCred extends HttpCredential = HttpCredential
> extends Partial<Disposable> {
  id: string;
  onGetInfo(): Promise<Info>;
  onGetChallenge(req: FastifyRequest<{ Body: ChallengeReq }>): Promise<Challenge>;
  onCanIssue(req: FastifyRequest<{ Body: CanIssueReq }>): Promise<CanIssue>;
  onIssue(req: FastifyRequest<{ Body: IssueReq }>): Promise<TCred>;
  onUpdateProofs(req: FastifyRequest<{ Body: HttpCredential }>): Promise<HttpCredential>;
}

export type HttpIssuerControllerModule = {
  HttpIssuerController: {
    new(...args: any[]): IHttpIssuerController
  }
}
