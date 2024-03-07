import {
  CanIssue,
  CanIssueReq,
  Challenge,
  ChallengeOptions,
  Gender,
  HttpCredential,
  IHttpIssuer,
  Info,
  IssueReq,
  SIGNATURE_PROOFS,
  SignatureProof,
  StrictChallengeReq,
  ZkCredential
} from "@zcredjs/core";
import { hash as sha256 } from "@stablelib/sha256";
import * as u8a from "uint8arrays";
import { Config } from "../../backbone/config.js";
import crypto from "node:crypto";
import { Disposable, tokens } from "typed-inject";
import { TimedCache } from "../../services/timed-cache.js";
import { ClientErr, ServerErr } from "../../backbone/errors.js";
import { IWebhookHandler } from "../../services/types/webhook-handler.js";
import { FastifyRequest } from "fastify";
import { SignatureVerifier } from "../../services/signature-verifier/index.js";
import { ISO3166 } from "trgraph";
import { CredentialProver } from "../../services/credential-provers/index.js";
import { Schemas } from "../../services/schema-finder/index.js";
import { DIDService } from "../../services/did.service.js";
import { sybil } from "../../services/sybiljs/index.js";
import { CredentialType } from "../../services/sybiljs/types/index.js";
import type { IPassportKYCService, WebhookResult } from "./types.js";
import { StubPassportKYC } from "./kyc/stub-passport-kyc.js";
import { PassportAttributes, PassportCredential } from "../../services/sybiljs/passport/types.js";

type Session = {
  reference: string;
  challengeReq: ChallengeReq;
  webhookResp?: WebhookResult;
  challenge: Challenge
}

interface StrictChallengeOptions extends ChallengeOptions {
  chainId: string;
}

interface ChallengeReq extends StrictChallengeReq {
  validUntil: string;
  options: StrictChallengeOptions;
}

export class PassportIssuer
  implements IHttpIssuer, IWebhookHandler, Disposable {

  private readonly secret: string;
  private readonly sessionCache: TimedCache<string, Session>;
  private readonly passportKYC: IPassportKYCService;

  static inject = tokens(
    "config",
    "signatureVerifier",
    "credentialProver",
    "didService"
  );
  constructor(
    private readonly config: Config,
    private readonly signatureVerifier: SignatureVerifier,
    private readonly credentialProver: CredentialProver,
    private readonly didService: DIDService
  ) {
    this.secret = config.secret;
    this.sessionCache = new TimedCache<string, Session>(config.kycSessionTtl);
    this.passportKYC = new StubPassportKYC(config);
  }

  get uri(): URL {
    return sybil
      .issuerPath("passport")
      .endpoint(this.config.pathToExposeDomain.href);
  };

  get credentialType(): CredentialType { return "passport";}

  async getInfo(): Promise<Info> {
    const minaIssuerReference = this.credentialProver
      .signProver("mina:poseidon-pasta")
      .issuerReference;
    return {
      protection: {
        jws: {
          kid: this.didService.verificationMethod
        }
      },
      issuer: {
        type: "http",
        uri: this.uri.href
      },
      credential: {
        type: "passport",
        attributesPolicy: {
          validUntil: "custom",
          validFrom: "strict"
        }
      },
      proofs: {
        updatable: false,
        updatedAt: new Date(2024, 0, 1, 0, 0, 0).toISOString(),
        types: {
          "mina:poseidon-pasta": [minaIssuerReference]
        }
      }
    };
  }

  async getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    if (!this.validateChallengeReq(challengeReq)) {
      throw new ClientErr(`Bad request. "validUntil" and "chainId" is undefined`);
    }
    const reference = this.passportKYC.createReference(crypto.randomUUID());
    const sessionId = this.toSessionId(reference);
    const { verifyURL } = await this.passportKYC.initializeProcedure({ reference });
    const challenge: Challenge = {
      sessionId: sessionId,
      verifyURL: verifyURL.href,
      message: getMessage(challengeReq)
    };
    this.sessionCache.set(sessionId, { reference, challenge, challengeReq });
    return challenge;
  }

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssue> {
    const fountSession = this.sessionCache.find(sessionId);
    if (!fountSession) {
      throw new ClientErr(`No session with id ${sessionId}`);
    }
    if (!fountSession.webhookResp) return { canIssue: false };
    this.checkWebhookResp(fountSession.webhookResp);
    return { canIssue: true };
  };

  async handleWebhook(req: FastifyRequest): Promise<any> {
    const webhookResp = await this.passportKYC.handleWebhook(req);
    const sessionId = this.toSessionId(webhookResp.reference);
    const session = this.sessionCache.get(sessionId);
    session.webhookResp = webhookResp;
    this.sessionCache.set(sessionId, session);
  }

  async issue<
    TCred extends HttpCredential = HttpCredential
  >({ sessionId, signature }: IssueReq): Promise<TCred> {
    const session = this.sessionCache.get(sessionId);
    const { subject } = session.challengeReq;
    const webhookResp = session.webhookResp;
    if (!webhookResp) {
      throw new ClientErr(`Verification process has not been completed`);
    }
    this.checkWebhookResp(webhookResp);
    const verified = await this.verifySignature(signature, session);
    if (!verified) {
      throw new ClientErr(`Signature is not verified for ${subject.id.key}`);
    }
    const attributes = this.toAttributes(webhookResp, session);
    const proofs = await this.createProofs(attributes);
    const credential: Omit<PassportCredential, "protection"> = {
      meta: {
        issuer: {
          type: "http",
          uri: this.uri.href
        },
        definitions: {
          attributes: {
            type: "document type (passport)",
            validFrom: "passport valid from date",
            issuanceDate: "passport issuance date",
            validUntil: "passport valid until",
            subject: {
              id: {
                type: "passport owner public key type",
                key: "passport owner public key"
              },
              firstName: "passport owner first name",
              lastName: "passport owner last name",
              birthDate: "passport owner birth date",
              gender: "passport owner gender"
            },
            countryCode: "passport country code",
            document: {
              id: "passport id (should be private)",
              sybilId: "document unique public id"
            },
          }
        }
      },
      attributes: attributes,
      proofs
    };
    const protectedCred: PassportCredential = {
      ...credential,
      protection: {
        jws: await this.createJWS(credential)
      }
    };
    this.sessionCache.delete(sessionId);
    // @ts-expect-error
    return protectedCred;
  };

  dispose(): void | PromiseLike<void> {
    this.sessionCache.dispose();
  };

  private async createProofs(
    attributes: PassportAttributes
  ): Promise<ZkCredential["proofs"]> {
    const signProofsInfo: Record<string, {
      reference: string,
      proof: SignatureProof
    }> = {};
    for (const signProofType of SIGNATURE_PROOFS) {
      const transSchema = Schemas.getSignature({
        proofType: signProofType,
        credentialType: "passport",
        idType: attributes.subject.id.type
      });
      const signProof = await this.credentialProver.signAttributes(signProofType, {
        attributes,
        transSchema
      });
      signProofsInfo[signProofType] = {
        reference: `${signProof.issuer.id.type}:${signProof.issuer.id.key}`,
        proof: signProof
      };
    }
    // set proofs
    const target: ZkCredential["proofs"] = {};
    for (const signProofType of Object.keys(signProofsInfo)) {
      const { reference, proof } = signProofsInfo[signProofType]!;
      if (!target[signProofType]) target[signProofType] = {};
      (target[signProofType] as any)[reference] = proof;
    }
    return target;
  }

  private toAttributes(
    webhookResp: WebhookResult,
    session: Session
  ): PassportAttributes {
    const { validUntil, subject: { id } } = session.challengeReq;
    const passport = webhookResp.passport;
    const sybilId = this.getSybilId(passport);
    return {
      type: "passport",
      issuanceDate: new Date().toISOString(),
      validFrom: passport.validFrom,
      validUntil: chooseValidUntil(validUntil, passport.validUntil),
      subject: {
        id: { type: id.type, key: id.key },
        firstName: passport.subject.firstName,
        lastName: passport.subject.lastName,
        birthDate: passport.subject.birthDate,
        gender: passport.subject.gender,
      },
      countryCode: passport.countryCode,
      document: {
        id: passport.document.id,
        sybilId: sybilId
      }
    };
  }

  private getSybilId(passport: WebhookResult["passport"]) {
    const birthDate = new Date(passport.subject.birthDate);
    const bdYear = String(birthDate.getUTCFullYear());
    const month = birthDate.getUTCMonth().toString();
    const bdMonth = month.length === 1 ? `0${month}` : month;
    const day = birthDate.getUTCDate().toString();
    const bdDay = day.length === 1 ? `0${day}` : day;
    const input = u8a.fromString([
      bdYear, bdMonth, bdDay, passport.countryCode, passport.document.id
    ].join(""));
    const hash = sha256(input);
    return u8a.toString(hash.slice(12), "base58btc");
  }

  private async createJWS(cred: Omit<HttpCredential, "protection">): Promise<string> {
    const dagJWS = await this.didService.createJWS(cred);
    const [jwsSignature] = dagJWS.signatures;
    return jwsSignature?.protected + ".." + jwsSignature?.signature;
  }

  private async verifySignature(signature: string, session: Session) {
    const { subject, options } = session.challengeReq;
    const { message } = session.challenge;
    return this.signatureVerifier.verify(subject.id.type, {
      signature: signature,
      publickey: subject.id.key,
      message: message,
      options: options
    });
  }

  private checkWebhookResp(webhookResp: WebhookResult) {
    if (!webhookResp.verified) {
      this.sessionCache.delete(this.toSessionId(webhookResp.reference));
      throw new ClientErr(`Verification is not passed`);
    }
  }

  private validateChallengeReq(req: ChallengeReq): req is ChallengeReq {
    return !!(req.validUntil && req.options?.chainId);
  }

  private toSessionId(reference: string) {
    return crypto.createHmac("sha256", this.secret)
      .update(reference)
      .digest("base64url");
  }
}

function chooseValidUntil(chosenValidUntil: string, docValidUntil: string | null) {
  if (!docValidUntil) return chosenValidUntil;
  const docExpDate = new Date(docValidUntil).getTime();
  const chosenExpDate = new Date(chosenValidUntil).getTime();
  if (chosenExpDate > docExpDate) return docValidUntil;
  else return chosenValidUntil;
}

// TODO put it to shuftypro if get agreement
// @ts-expect-error
function toAlpha3CC(alpha2: string): string {
  const isAlpha2 = ISO3166.isAlpha2(alpha2);
  if (!isAlpha2) throw new ServerErr({
    message: `Internal server error`,
    place: `Passport issuer ${toAlpha3CC.name} function`,
    description: `${alpha2} is not ISO-3166 2-alphabet code`
  });
  const numeric = ISO3166.getNumeric(alpha2);
  return ISO3166.getAlpha3(numeric);
}

function getMessage<TReq extends StrictChallengeReq = StrictChallengeReq>({
  subject,
  validFrom,
}: TReq): string {
  const nonce = crypto.randomUUID();
  const description = `Sign the message to get Passport Zero-Knowledge Credential`;
  const addressType = subject.id.type;
  const address = subject.id.key;

  return [
    "Description:" + "\n" + description,
    "Address type:" + "\n" + addressType,
    "Address:" + "\n" + address,
    "Expiration date:" + "\n" + validFrom,
    "Issuer:" + "\n" + "Sybil Center",
    "nonce:" + "\n" + nonce
  ].join("\n\n");
}

// TODO put it to shuftypro if we get agreement
// @ts-expect-error
function toGender(gender: string): Gender {
  const GENDER_MAP: Record<string, Gender> = {
    "M": "male",
    "m": "male",
    "F": "female",
    "f": "female",
    "O": "other",
    "o": "other"
  };
  if (GENDER_MAP[gender]) return GENDER_MAP[gender] as Gender;
  throw new ServerErr({
    message: "Internal server error",
    place: `Passport issuer ${toGender.name} function`,
    description: `Can not find standard gender alias for ${gender}`
  });
}
