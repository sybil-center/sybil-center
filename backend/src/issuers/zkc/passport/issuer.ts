import { IssuerTypes, IZkcIssuer, ZkcChallenge, ZkcChallengeReq } from "../../../base/types/zkc.issuer.js";
import { IWebhookHandler } from "../../../base/types/webhook-handler.js";
import { Proved, ZkcId, ZkCred, ZkcSchemaNums } from "../../../base/types/zkc.credential.js";
import {
  Inquiry,
  PERSONA_GOV_ID_TYPES,
  PersonaGovIdTypes,
  PersonaKYC
} from "../../../base/service/external/persona-kyc.service.js";
import { Disposable, tokens } from "typed-inject";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { Config } from "../../../backbone/config.js";
import { IZkcSignerManager } from "../../../base/service/signers/zkc.signer-manager.js";
import { IVerifierManager } from "../../../base/service/verifiers/verifier.manager.js";
import { randomUUID } from "node:crypto";
import { FastifyRequest } from "fastify";
import { ClientError, ServerError } from "../../../backbone/errors.js";
import { ISO3166 } from "../../../util/iso-3166.js";
import { ZKC } from "../../../util/zk-credentials/index.js";

export interface PassportChallenge extends ZkcChallenge {
  verifyURL: string;
}

export type ZkPassportCred = ZkCred<{
  fn: string;
  ln: string;
  bd: number;
  cc: number;
  doc: {
    t: DocTypes;
    id: string;
  }
}>

type PassportSession = {
  message: string;
  subjectId: ZkcId;
  verifyURL: string;
  challengeReq: ZkcChallengeReq;
  webhookResult?: Inquiry["Hook"]["Return"]
}

const MS_FROM_1900_TO_1970 = -(new Date("1900-01-01T00:00:00.000Z").getTime());

interface IT extends IssuerTypes {
  Cred: Proved<ZkPassportCred>;
  Challenge: PassportChallenge;
}

export class ZkcPassportIssuer
  implements IZkcIssuer<IT>,
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

  async getChallenge(challengeReq: IT["ChallengeReq"]): Promise<IT["Challenge"]> {
    const sbjId = challengeReq.subjectId;
    const refId = this.personaKYC.refId(sbjId);
    const found = this.sessionCache.find(refId);
    if (found) {
      return {
        sessionId: refId,
        verifyURL: found.verifyURL,
        message: found.message,
      };
    }
    const { verifyURL } = await this.personaKYC.createInquiry({ referenceId: refId });
    const message = getMessage(challengeReq);
    this.sessionCache.set(refId, {
      verifyURL: verifyURL,
      message: message,
      subjectId: sbjId,
      challengeReq: challengeReq,
    });
    return {
      verifyURL: verifyURL,
      message: message,
      sessionId: refId
    };
  }

  async canIssue({ sessionId: refId }: IT["CanIssueReq"]): Promise<IT["CanIssueResp"]> {
    const { webhookResult } = this.sessionCache.get(refId);
    if (!webhookResult) return { canIssue: false };
    if (!webhookResult.completed) throw new ClientError(webhookResult.reason!);
    return { canIssue: true };
  }

  async handleWebhook(req: FastifyRequest): Promise<any> {
    const hookResult = await this.personaKYC.handleWebhook(req);
    const refId = hookResult.referenceId;
    const session = this.sessionCache.get(refId);
    session.webhookResult = hookResult;
  }

  async issue({ sessionId: refId, signature }: IT["IssueReq"]): Promise<IT["Cred"]> {
    const {
      message,
      webhookResult,
      subjectId,
      challengeReq: { expirationDate, options }
    } = this.sessionCache.get(refId);
    if (!webhookResult || !webhookResult.completed) {
      throw new ClientError("Your Government ID is not verified");
    }
    const verified = await this.verifierManager.verify(subjectId.t, {
      sign: signature,
      msg: message,
      publickey: subjectId.k
    }, options);
    if (!verified) throw new ClientError("Signature is not verified");
    const { user } = webhookResult;
    // @ts-ignore
    const transSchema = ZKC.transSchemas[subjectId.t][this.providedSchema];
    if (!transSchema) {
      throw new ClientError(`Subject ZKC id with type ${subjectId.t} is not supported`);
    }
    const countryCode = ISO3166.numeric(user.countryCode);
    if (!countryCode) {
      throw new ServerError("Internal server error", {
        props: {
          _place: this.constructor.name,
          _log: `Received alphabet ${user.countryCode} country code has not numeric representation`
        }
      });
    }
    const zkCred = this.signerManager.signZkCred<ZkPassportCred>(subjectId.t, {
      sch: this.providedSchema,
      isd: new Date().getTime(),
      exd: expirationDate ? expirationDate : 0,
      sbj: {
        id: subjectId,
        fn: user.firstName,
        ln: user.lastName,
        bd: (user.birthdate.getTime() + MS_FROM_1900_TO_1970),
        cc: countryCode,
        doc: {
          t: toCredDocType(user.document.type),
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
  subjectId,
  expirationDate,
}: ZkcChallengeReq): string {
  const nonce = randomUUID();
  const description = `Sign the message to prove your Government ID and get Passport Zero-Knowledge Credential`;
  const address = subjectId.k;
  const targetExDate = expirationDate
    ? new Date(expirationDate).toISOString()
    : "Without an expiration date";
  return [
    "Description:" + "\n" + description,
    "Address:" + "\n" + address,
    "Expiration date:" + "\n" + targetExDate,
    "Issuer:" + "\n" + "Sybil Center",
    "nonce:" + "\n" + nonce
  ].join("\n\n");
}

const DOC_TYPES = [
  1, // Passport
  2, // Driver license
  3, // Identification card
  4, // Passport card
  0, // OTHER - something that we do not support now
] as const;

export type DocTypes = typeof DOC_TYPES[number]


/** Adapt Persona Government ID type to Passport Credential document type*/
const DOC_TYPE_ADAPTOR: Record<PersonaGovIdTypes, DocTypes> = {
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

function toCredDocType(docType: string): DocTypes {
  function isPersonaDocType(pDocType: string): pDocType is PersonaGovIdTypes {
    return PERSONA_GOV_ID_TYPES
      // @ts-ignore
      .includes(pDocType);
  }
  const typeOfPersona = isPersonaDocType(docType);
  if (typeOfPersona) {
    return DOC_TYPE_ADAPTOR[docType];
  }
  throw new ClientError("Invalid persona Government ID document type");
}
