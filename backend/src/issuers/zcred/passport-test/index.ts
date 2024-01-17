import {
  ACIProof,
  ACIProofType,
  CanIssue,
  CanIssueReq,
  Challenge,
  ChallengeOptions,
  CredType,
  Gender,
  HttpCredential,
  Info,
  IssueReq,
  IZHttpIssuer,
  PassportAttributes,
  PassportCred,
  SIGNATURE_PROOFS,
  SignatureProof,
  SignProofType,
  ZChallengeReq,
  zcredjs,
  ZkCredential
} from "@zcredjs/core";
import { Config } from "../../../backbone/config.js";
import crypto from "node:crypto";
import { Disposable, tokens } from "typed-inject";
// import { ShuftiWebhookResp } from "../../../services/kyc/shuftipro.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { ClientErr, ServerErr } from "../../../backbone/errors.js";
import { IWebhookHandler } from "../../../base/types/webhook-handler.js";
import { FastifyRequest } from "fastify";
import { SignatureVerifier } from "../../../services/signature-verifier/index.js";
import { ISO3166 } from "trgraph";
import { CredentialProver } from "../../../services/credential-prover/index.js";
import { SCHEMAS } from "../../../services/schema-finder/index.js";
import { DIDService } from "../../../base/service/did.service.js";
import { Inquiry, PersonaKYC } from "../../../base/service/external/persona-kyc.service.js";

type Session = {
  reference: string;
  challengeReq: StrictChallengeReq;
  webhookResp?: Inquiry["Hook"]["Return"];
  challenge: Challenge
}

interface StrictChallengeOptions extends ChallengeOptions {
  chainId: string;
}

interface StrictChallengeReq extends ZChallengeReq {
  validUntil: string;
  options: StrictChallengeOptions;
}

export class PassportTestIssuer
  implements IZHttpIssuer, IWebhookHandler, Disposable {

  // private readonly templateId: string;
  private readonly secret: string;
  private readonly sessionCache: TimedCache<string, Session>;
  private readonly personaKYC: PersonaKYC;

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
    // this.templateId = config.shuftiproPassportTamplate;
    this.sessionCache = new TimedCache<string, Session>(config.kycSessionTtl);
    this.personaKYC = new PersonaKYC(config);
  }

  get uri(): URL {
    return zcredjs
      .issuerPath("passport-test")
      .endpoint(this.config.pathToExposeDomain.href);
  };
  get credentialType(): CredType { return "passport-test";}

  async getInfo(): Promise<Info> {
    const minaIssuerReference = this.credentialProver
      .signProver("mina:poseidon-pasta")
      .issuerReference;
    return {
      kid: this.didService.verificationMethod,
      credentialType: this.credentialType,
      updatableProofs: false,
      proofsUpdated: new Date(2024, 0, 1, 0, 0, 0).toISOString(),
      proofsInfo: [
        {
          type: "mina:poseidon-pasta",
          references: [minaIssuerReference]
        },
        {
          type: "aci:mina-poseidon",
          references: [minaIssuerReference]
        }
      ]
    };
  }

  async getChallenge(challengeReq: ZChallengeReq): Promise<Challenge> {
    if (!this.validateChallengeReq(challengeReq)) {
      throw new ClientErr(`Bad request. "validUntil" and "chainId" is undefined`);
    }
    const reference = this.personaKYC.createReference(crypto.randomUUID());
    const sessionId = this.toSessionId(reference);
    const { verifyURL } = await this.personaKYC.createInquiry({
      referenceId: reference,
    });
    const challenge: Challenge = {
      sessionId: sessionId,
      verifyURL: verifyURL,
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
    // this.checkWebhookResp(fountSession.webhookResp);
    return { canIssue: true };
  };

  async handleWebhook(req: FastifyRequest): Promise<any> {
    const webhookResp = await this.personaKYC.handleWebhook(req);
    const sessionId = this.toSessionId(webhookResp.referenceId);
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
    // this.checkWebhookResp(webhookResp);
    const verified = await this.verifySignature(signature, session);
    if (!verified) {
      throw new ClientErr(`Signature is not verified for ${subject.id.key}`);
    }
    const attributes = this.toAttributes(webhookResp, session);
    const proofs = await this.createProofs(attributes);
    const credential: Omit<PassportCred, "jws"> = {
      meta: {
        issuer: {
          type: "http",
          uri: this.uri.href
        }
      },
      attributes,
      proofs
    };
    const protectedCred: PassportCred = {
      ...credential,
      jws: await this.createJWS(credential)
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
    const aciProofsInfo: Record<string, {
      reference: string,
      proof: ACIProof
    }> = {};
    const aciProofsForSign: Record<SignProofType, ACIProofType> = {
      "mina:poseidon-pasta": "aci:mina-poseidon"
    };
    for (const signProofType of SIGNATURE_PROOFS) {
      const transSchema = SCHEMAS.getSignature({
        proofType: signProofType,
        credentialType: "passport-test",
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
    for (const proofType of Object.keys(signProofsInfo)) {
      const aciReference = signProofsInfo[proofType]!.reference;
      const aciProofType = aciProofsForSign[proofType as SignProofType];
      if (aciProofType) {
        const transSchema = SCHEMAS.getACI({
          credentialType: "passport-test",
          proofType: aciProofType
        });
        const aciProof = await this.credentialProver.createACIProof(aciProofType, {
          attributes,
          transSchema
        });
        aciProofsInfo[aciProofType] = {
          reference: aciReference,
          proof: aciProof
        };
      }
    }
    // set proofs
    const target: ZkCredential["proofs"] = {};
    for (const signProofType of Object.keys(signProofsInfo)) {
      const { reference, proof } = signProofsInfo[signProofType]!;
      if (!target[signProofType]) target[signProofType] = {};
      (target[signProofType] as any)[reference] = proof;
    }
    for (const aciProofType of Object.keys(aciProofsInfo)) {
      const { reference, proof } = aciProofsInfo[aciProofType]!;
      if (!target[aciProofType]) target[aciProofType] = {};
      (target[aciProofType] as any)[reference] = proof;
    }
    return target;
  }

  private toAttributes(
    webhookResp: Inquiry["Hook"]["Return"],
    session: Session
  ): PassportAttributes {
    const { validUntil, subject: { id } } = session.challengeReq;
    const user = webhookResp.user;
    return {
      type: "passport-test",
      issuanceDate: new Date().toISOString(),
      validFrom: new Date(2024, 0, 0).toISOString(),
      validUntil: chooseValidUntil(validUntil, new Date(2050, 0, 0).toISOString()),
      subject: {
        id: { type: id.type, key: id.key },
        firstName: user.firstName.toUpperCase(),
        lastName: user.lastName.toUpperCase(),
        birthDate: user.birthdate.toISOString(),
        gender: toGender("O"),
        countryCode: toAlpha3CC(user.countryCode),
        document: {
          id: user.document.id
        }
      }
    };
  }

  private async createJWS(cred: Omit<HttpCredential, "jws">): Promise<string> {
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

  // private checkWebhookResp(webhookResp: ShuftiWebhookResp) {
  //   if (webhookResp.verifyResult !== "accepted") {
  //     this.sessionCache.delete(this.toSessionId(webhookResp.reference));
  //     throw new ClientErr(`Verification is not passed`);
  //   }
  // }

  private validateChallengeReq(req: ZChallengeReq): req is StrictChallengeReq {
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

function toAlpha3CC(alpha2: string): string {
  // const isAlpha2 = ISO3166.isAlpha2(alpha2);
  // if (!isAlpha2) throw new ServerErr({
  //   message: `Internal server error`,
  //   place: `Passport-test issuer ${toAlpha3CC.name} function`,
  //   description: `${alpha2} is not ISO-3166 2-alphabet code`
  // });
  const numeric = ISO3166.getNumeric(alpha2);
  return ISO3166.getAlpha3(numeric);
}

function getMessage<TReq extends StrictChallengeReq = StrictChallengeReq>({
  subject,
  validFrom,
}: TReq): string {
  const nonce = crypto.randomUUID();
  const description = `Sign the message to get Passport-test Zero-Knowledge Credential`;
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
    place: `Passport-test issuer ${toGender.name} function`,
    description: `Can not find standard gender alias for ${gender}`
  });
}
