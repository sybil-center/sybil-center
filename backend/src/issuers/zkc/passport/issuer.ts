import { ChallengeReq, GovernmentIdType, ISybilIssuer, PassportCred, PassportIT, Schema } from "@sybil-center/zkc-core";
import { Config } from "../../../backbone/config.js";
import { Disposable, tokens } from "typed-inject";
import { SignVerifierManager } from "../../../base/service/verifiers/sign-verifier.manager.js";
import { ZKCSignerManager } from "../../../base/service/signers/zkc.signer-manager.js";
import {
  Inquiry,
  PERSONA_GOV_ID_TYPES,
  type PersonaGovIdType,
  PersonaKYC
} from "../../../base/service/external/persona-kyc.service.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { randomUUID } from "node:crypto";
import { type IWebhookHandler } from "../../../base/types/webhook-handler.js";
import { ClientError, ServerError } from "../../../backbone/errors.js";
import { FastifyRequest } from "fastify";
import { ISO3166 } from "../../../util/iso-3166.js";
import sortKeys from "sort-keys";


const MS_FROM_1900_TO_1970 = -(new Date("1900-01-01T00:00:00.000Z").getTime());

type PassportSession = {
  challengeReq: PassportIT["ChallengeReq"];
  message: string;
  verifyURL: string;
  webhookResult?: Inquiry["Hook"]["Return"];
}

export class ZKCPassportIssuer
  implements ISybilIssuer<PassportIT>, IWebhookHandler, Disposable {

  private readonly personaKYC: PersonaKYC;
  private readonly sessionCache: TimedCache<string, PassportSession>;
  static inject = tokens(
    "config",
    "signVerifierManager",
    "zkcSignerManager"
  );
  constructor(
    config: Config,
    private readonly verifierManager: SignVerifierManager,
    private readonly zkcSignerManager: ZKCSignerManager
  ) {
    this.personaKYC = new PersonaKYC(config);
    this.sessionCache = new TimedCache<string, PassportSession>(config.kycSessionTtl);
  }

  get providedSchema(): Schema { return 0;};

  async getChallenge(
    challengeReq: PassportIT["ChallengeReq"]
  ): Promise<PassportIT["Challenge"]> {
    const subjectId = challengeReq.subjectId;
    const refId = this.personaKYC.refId(subjectId);
    const found = this.sessionCache.find(refId);
    if (found) {
      return {
        sessionId: refId,
        verifyURL: found.verifyURL,
        message: found.message
      };
    }
    const { verifyURL } = await this.personaKYC.createInquiry({ referenceId: refId });
    const message = getMessage(challengeReq);
    this.sessionCache.set(refId, {
      verifyURL: verifyURL,
      message: message,
      challengeReq: challengeReq
    });
    return {
      verifyURL: verifyURL,
      message: message,
      sessionId: refId
    };
  }

  async canIssue(
    { sessionId: refId }: PassportIT["CanIssueReq"]
  ): Promise<PassportIT["CanIssueResp"]> {
    const session = this.sessionCache.get(refId);
    if (!session.webhookResult) return { canIssue: false };
    if (!session.webhookResult.completed) throw new ClientError(session.webhookResult.reason!);
    return { canIssue: true };
  }

  async handleWebhook(req: FastifyRequest): Promise<any> {
    const hookResult = await this.personaKYC.handleWebhook(req);
    const refId = hookResult.referenceId;
    const session = this.sessionCache.get(refId);
    session.webhookResult = hookResult;
  }

  async issue({
      sessionId: refId,
      signature
    }: PassportIT["IssueReq"]
  ): Promise<PassportIT["Cred"]> {
    const session = this.sessionCache.get(refId);
    if (!session) throw new ClientError(`Session ${refId} has been expired`);
    const {
      webhookResult,
      message,
      challengeReq: {
        subjectId,
        options
      }
    } = session;
    if (!this.checkWebhook(webhookResult)) throw new Error();
    const verified = await this.verifierManager.verify({
      subjectId: subjectId,
      signEntry: { msg: message, sign: signature },
      options: options
    });
    if (!verified) throw new ClientError(`Signature is not verified`);
    const { user } = webhookResult;
    const countryCode = this.toNumCountryCode(user.countryCode);
    const attributes: PassportCred["attributes"] = {
      sch: this.providedSchema,
      isd: new Date().getTime(),
      exd: options?.expirationDate ? options.expirationDate : 0,
      sbj: {
        id: subjectId,
        fn: user.firstName,
        ln: user.lastName,
        bd: (user.birthdate.getTime() + MS_FROM_1900_TO_1970),
        cc: countryCode,
        doc: {
          t: this.toGovernmentIdType(user.document.type),
          id: user.document.id
        }
      }
    };
    const cred = await this.zkcSignerManager.proveZkCred<PassportCred>({
      attributes: attributes,
      proofTypes: options?.proofTypes
    });
    this.sessionCache.delete(refId);
    return sortKeys(cred, { deep: true });
  }

  private checkWebhook(
    webhookResult?: Inquiry["Hook"]["Return"]
  ): webhookResult is Inquiry["Hook"]["Return"] {
    if (!webhookResult) throw new ClientError(`Your Government ID verification in process. Wait`);
    if (!webhookResult.completed) throw new ClientError(`Your Government ID is not verified`);
    return true;
  }

  private toNumCountryCode(countryCode: string): number {
    const numCC = ISO3166.numeric(countryCode);
    if (numCC) return numCC;
    throw new ServerError("Internal server error", {
      props: {
        _place: this.constructor.name,
        _log: `Received alphabet ${countryCode} country code has not numeric representation`
      }
    });
  }

  private toGovernmentIdType(type: string) {
    const isPersonaIdType = function (_type: string): _type is PersonaGovIdType {
      return PERSONA_GOV_ID_TYPES
        // @ts-ignore
        .includes(_type);
    }(type);
    if (isPersonaIdType) return GOVERNMENT_ID_ADAPTER[type];
    throw new ServerError(`Unsupported government id type`, {
      props: {
        _place: this.constructor.name,
        _log: `Unsupported Persona government id type ${type}`
      }
    });
  }

  async dispose(): Promise<void> {
    this.sessionCache.dispose();
  }
}


function getMessage<TReq extends ChallengeReq = ChallengeReq>({
  subjectId,
  options
}: TReq): string {
  const nonce = randomUUID();
  const description = `Sign the message to prove your Government ID and get Passport Zero-Knowledge Credential`;
  const address = subjectId.k;
  const targetExDate = options?.expirationDate
    ? new Date(options.expirationDate).toISOString()
    : "Without an expiration date";
  return [
    "Description:" + "\n" + description,
    "Address:" + "\n" + address,
    "Expiration date:" + "\n" + targetExDate,
    "Issuer:" + "\n" + "Sybil Center",
    "nonce:" + "\n" + nonce
  ].join("\n\n");
}

/** Adapt Persona Government ID type to Passport Credential document type*/
const GOVERNMENT_ID_ADAPTER: Record<PersonaGovIdType, GovernmentIdType> = {
  pp: 1,
  ipp: 1,
  dl: 2,
  id: 3,
  ppc: 4,
  visa: 0,
  cct: 0,
  cid: 0,
  foid: 0,
  hic: 0,
  keyp: 0,
  ltpass: 0,
  munid: 0,
  myn: 0,
  nbi: 0,
  nric: 0,
  ofw: 0,
  rp: 0,
  pan: 0,
  pid: 0,
  pr: 0,
  sss: 0,
  td: 0,
  umid: 0,
  vid: 0,
  wp: 0
};


