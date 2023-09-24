import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../../base/types/zkc.issuer.js";
import { IWebhookHandler } from "../../../base/types/webhook-handler.js";
import { ZkcId, ZkCredProved, ZkcSchemaNums } from "../../../base/types/zkc.credential.js";
import { Inquiry, PersonaKYC } from "../../../base/service/external/persona-kyc.service.js";
import { Disposable, tokens } from "typed-inject";
import { zkc } from "../../../util/zk-credentials.util.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { Config } from "../../../backbone/config.js";
import { IZkcSignerManager } from "../../../base/service/signers/zkc.signer-manager.js";
import { IVerifierManager } from "../../../base/service/verifiers/verifier.manager.js";
import { randomUUID } from "node:crypto";
import { FastifyRequest } from "fastify";
import { ClientError } from "../../../backbone/errors.js";

export interface PassportChallenge extends ZkcChallenge {
  verifyURL: string;
}

type PassportSession = {
  message: string;
  sbjId: ZkcId;
  challengeReq: ZkcChallengeReq;
  webhookResult?: Inquiry["Hook"]["Return"]
  opt?: Record<string, any>;
}

export class ZkcPassportIssuer
  implements IZkcIssuer<
    ZkcChallengeReq,
    PassportChallenge
  >,
    IWebhookHandler,
    Disposable {

  static inject = tokens(
    "config",
    "zkcSignerManager",
    "verifierManager"
  );
  constructor(
    config: Config,
    private readonly signerManager: IZkcSignerManager,
    private readonly verifierManager: IVerifierManager,
    private readonly personaKYC = new PersonaKYC(config),
    private readonly sessionCache = new TimedCache<string, PassportSession>(config.kycSessionTtl),
  ) {}

  get providedSchema(): ZkcSchemaNums { return 0;};

  async getChallenge(challengeReq: ZkcChallengeReq): Promise<PassportChallenge> {
    const sbjId = {
      t: zkc.toId(challengeReq.sbjId.t),
      k: challengeReq.sbjId.k
    };
    const refId = this.personaKYC.refId(sbjId);
    const { verifyURL } = await this.personaKYC.createInquiry({ referenceId: refId });
    const message = getMessage(challengeReq);
    this.sessionCache.set(refId, {
      message: message,
      sbjId: sbjId,
      challengeReq: challengeReq,
      opt: challengeReq.opt
    });
    return {
      verifyURL: verifyURL,
      message: message,
      sessionId: refId
    };
  }

  async handleWebhook(req: FastifyRequest): Promise<any> {
    const hookResult = await this.personaKYC.handleWebhook(req);
    const refId = hookResult.referenceId;
    const session = this.sessionCache.get(refId);
    session.webhookResult = hookResult;
  }

  async canIssue({ sessionId: refId }: ZkcCanIssueReq): Promise<ZkcCanIssueResp> {
    const { webhookResult } = this.sessionCache.get(refId);
    if (!webhookResult) return { canIssue: false };
    if (!webhookResult.completed) throw new ClientError(webhookResult.reason!);
    return { canIssue: true };
  }

  async issue({ sessionId: refId, signature }: ZkcIssueReq): Promise<ZkCredProved> {
    const {
      message,
      webhookResult,
      sbjId,
      challengeReq: { exd },
      opt
    } = this.sessionCache.get(refId);
    if (!webhookResult || !webhookResult.completed) {
      throw new ClientError("Your Government ID is not verified");
    }
    const verified = await this.verifierManager.verify(sbjId.t, {
      sign: signature,
      msg: message,
      publickey: sbjId.k
    }, opt);
    if (!verified) throw new ClientError("Signature is not verified");
    const { user } = webhookResult;
    const transSchema = zkc.transSchemas(this.providedSchema)[sbjId.t];
    if (!transSchema) {
      throw new ClientError(`Subject ZKC id with type ${sbjId.t} is not supported`);
    }
    const zkCred = this.signerManager.signZkCred(sbjId.t, {
      sch: this.providedSchema,
      isd: new Date().getTime(),
      exd: exd ? exd : 0,
      sbj: {
        id: sbjId,
        fn: user.firstName,
        ln: user.lastName,
        bd: user.birthdate,
        cc: user.countryCode,
        doc: {
          t: user.document.type,
          id: user.document.id
        }
      }
    }, transSchema);
    this.sessionCache.delete(refId);
    return zkCred;
  }

  async dispose() {
    this.sessionCache.dispose();
  }
}

function getMessage({
  sbjId,
  exd,
}: ZkcChallengeReq): string {
  const nonce = randomUUID();
  const description = `Sign the message to prove your Government ID and get Passport Zero-Knowledge Credential`;
  const address = sbjId.k;
  const expirationDate = exd
    ? new Date(exd).toISOString()
    : "Without an expiration date";
  return [
    "Description:" + "\n" + description,
    "Address:" + "\n" + address,
    "Expiration date:" + "\n" + expirationDate,
    "Issuer:" + "\n" + "Sybil Center",
    "nonce:" + "\n" + nonce
  ].join("\n\n");
}