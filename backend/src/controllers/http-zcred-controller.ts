import { Injector } from "typed-inject";
import { HttpServer } from "../backbone/http-server.js";
import { contextUtil } from "../util/context.util.js";
import {
  type CanIssueReq,
  type ChallengeReq,
  type HttpCredential,
  IEC,
  isCanIssueReq,
  isChallengeReq,
  isIssueReq,
  type IssueReq,
  isZkCredential
} from "@zcredjs/core";
import { IssuerException } from "../backbone/errors.js";
import { FastifyRequest } from "fastify";
import { getIssuerIds } from "../util/index.js";
import { HttpIssuerControllerSupervisor } from "../issuers/http-issuer-controller-supervisor.js";

type Dependencies = {
  httpServer: HttpServer,
  httpIssuerControllerSupervisor: HttpIssuerControllerSupervisor
}

const TOKENS: (keyof Dependencies)[] = [
  "httpServer",
  "httpIssuerControllerSupervisor"
];

export function HttpZcredController(injector: Injector<Dependencies>) {
  const {
    httpServer: { fastify },
    httpIssuerControllerSupervisor: controllerSupervisor
  } = contextUtil.from(TOKENS, injector);

  for (const id of getIssuerIds()) {

    fastify.get(`/issuers/${id}/info`, async () => {
      return await controllerSupervisor.getController(id).onGetInfo();
    });

    fastify.post(`/issuers/${id}/challenge`, async (req: FastifyRequest<{ Body: ChallengeReq }>) => {
      const body = req.body;
      if (!isChallengeReq(body)) throw new IssuerException({
        code: IEC.CHALLENGE_BAD_REQ,
        msg: `Bad "challenge" request, body: ${JSON.stringify(body)}`,
        desc: `Bad "challenge" req for issuer with id: ${id}, body: ${JSON.stringify(body)}`
      });
      return await controllerSupervisor.getController(id).onGetChallenge(req);
    });

    fastify.post(`/issuers/${id}/can-issue`, async (req: FastifyRequest<{ Body: CanIssueReq }>) => {
      const body = req.body;
      if (!isCanIssueReq(body)) throw new IssuerException({
        code: IEC.CAN_ISSUE_BAD_REQ,
        msg: `Bad "can issue" request, body: ${JSON.stringify(body)}`,
        desc: `Bad "can issue" request for issuer with id: ${id}, body: ${JSON.stringify(body)}`
      });
      return await controllerSupervisor.getController(id).onCanIssue(req);
    });

    fastify.post(`/issuers/${id}/issue`, async (req: FastifyRequest<{ Body: IssueReq }>) => {
      const body = req.body;
      if (!isIssueReq(body)) throw new IssuerException({
        code: IEC.ISSUE_BAD_REQ,
        msg: `Bad "issue" request, body: ${JSON.stringify(body)}`,
        desc: `Bad "issue" request for issuer with id: ${id}, body: ${JSON.stringify(body)}`
      });
      return await controllerSupervisor.getController(id).onIssue(req);
    });

    fastify.post(`/issuers/${id}/update-proofs`, async (req: FastifyRequest<{ Body: HttpCredential }>) => {
      const body = req.body;
      if (!isZkCredential(body)) throw new IssuerException({
        code: IEC.UPDATE_PROOFS_BAD_REQ,
        msg: `Bad "update proofs" request, body: ${JSON.stringify(body)}`,
        desc: `Bad "update proofs" request for issuer with id: ${id}, body: ${JSON.stringify(body)}`
      });
      return await controllerSupervisor.getController(id).onUpdateProofs(req);
    });
  }
}
