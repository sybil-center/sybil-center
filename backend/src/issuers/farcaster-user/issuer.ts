import { IIssuer } from "../../types/issuer.js";
import {
  type CanIssue,
  type CanIssueReq,
  type Challenge,
  type ChallengeReq,
  type HttpCredential,
  type IdType,
  IEC,
  type Info,
  isStrictChallengeReq,
  type IssueReq,
  type SignatureProof,
  type SignProofType,
  type StrictChallengeReq
} from "@zcredjs/core";
import crypto from "node:crypto";
import { ILogger } from "../../backbone/logger.js";
import { sybil } from "../../services/sybiljs/index.js";
import { Config } from "../../backbone/config.js";
import { CredentialProver } from "../../services/credential-provers/index.js";
import { tokens } from "typed-inject";
import { DIDService } from "../../services/did.service.js";
import { IssuerException } from "../../backbone/errors.js";
import { getSignMessage } from "../../services/sign-message.js";
import { ATTRIBUTE_DEFINITION, FarcasterUserAttributes, FarcasterUserCred, o1jsEthTransSchema } from "./types.js";
import { FarquestService, FarquestType } from "../../services/farquest.service.js";
import { SignatureVerifier } from "../../services/signature-verifier/index.js";
import { CacheClient } from "../../backbone/cache-client.js";
import Keyv from "@keyvhq/core";

const DIFINITIONS = {
  attributes: {
    type: "document type (farcaster followers number)",
    validFrom: "credential valid from",
    validUntil: "credential valid until",
    subject: {
      id: {
        type: "credential owner public key type",
        key: "credential owner public key"
      },
      followersNumber: "farcaster followers number"
    },
  }
};

interface RequiredChallengeReq extends StrictChallengeReq {
  subject: {
    id: {
      type: Extract<IdType, "ethereum:address">
      key: StrictChallengeReq["subject"]["id"]["key"]
    }
  };
}

function isRequiredChallengeReq(req: unknown): req is RequiredChallengeReq {
  return (
    isStrictChallengeReq(req) && req.subject.id.type === "ethereum:address"
  );
}

export type FarcasterUserIssuer = Issuer;

type Session = {
  challengeReq: RequiredChallengeReq;
  challenge: Challenge;
}


export class Issuer implements IIssuer<FarcasterUserCred> {

  private readonly sessionCache: Keyv<Session>;


  static inject = tokens(
    "logger",
    "config",
    "credentialProver",
    "didService",
    "farquestService",
    "signatureVerifier",
    "cacheClient"
  );
  constructor(
    logger: ILogger,
    private readonly config: Config,
    private readonly credProver: CredentialProver,
    private readonly didService: DIDService,
    private readonly farquestService: FarquestService,
    private readonly signatureVerifier: SignatureVerifier,
    cacheClient: CacheClient
  ) {
    this.sessionCache = cacheClient.createTtlCache<Session>({
      namespace: "farcaster-user",
      ttl: 30 * 1000
    });
    logger.info(`Issuer "${this.id}" initialized`);
  }

  id = "farcaster-user";

  get uri(): URL {
    return sybil
      .issuerPath(this.id)
      .endpoint(this.config.pathToExposeDomain.href);
  }

  async getInfo(): Promise<Info> {
    const minaSigner = this.credProver.signProver("mina:poseidon-pasta");
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
        type: this.id,
        attributesPolicy: {
          validUntil: "custom",
          validFrom: "strict"
        }
      },
      definitions: DIFINITIONS,
      proofs: {
        updatable: false,
        updatedAt: new Date(2024, 3, 5, 0, 0, 0).toISOString(),
        types: {
          "mina:poseidon-pasta": [minaSigner.issuerReference]
        }
      }

    };
  }

  async getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    if (!isRequiredChallengeReq(challengeReq)) throw new IssuerException({
      code: IEC.CHALLENGE_BAD_REQ,
      msg: `Bad challenge request`
    });
    const sessionId = crypto.randomUUID();
    const message = getSignMessage({
      desc: `Sign the message to get Farcaster followers number credential`,
      challengeReq: challengeReq,
      issuerDomain: this.config.pathToExposeDomain.hostname
    });
    const challenge: Challenge = {
      sessionId: sessionId,
      message: message,
    };
    await this.sessionCache.set(sessionId, {
      challenge: challenge,
      challengeReq: challengeReq
    });
    return challenge;
  }

  async canIssue(_: CanIssueReq): Promise<CanIssue> {
    return { canIssue: true };
  }

  async issue({
    sessionId,
    signature
  }: IssueReq): Promise<FarcasterUserCred> {
    const session = await this.sessionCache.get(sessionId);
    if (!session) throw new IssuerException({
      code: IEC.ISSUE_NO_SESSION,
      msg: "Session not found",
    });
    const verified = await this.verifySignature(signature, session);
    if (!verified) throw new IssuerException({
      code: IEC.ISSUE_BAD_SIGNATURE,
      msg: `Invalid signature`
    });
    const farcasterUser = await this.getFarcasterUser(session.challengeReq.subject.id.key);
    const attributes = this.toAttributes(farcasterUser, session);
    const proofs = await this.createProofs(attributes);
    const credential: Omit<FarcasterUserCred, "protection"> = {
      meta: {
        issuer: {
          type: "http",
          uri: this.uri.href
        },
        definitions: {
          attributes: ATTRIBUTE_DEFINITION
        }
      },
      attributes: attributes,
      proofs: proofs
    };
    const protectedCred: FarcasterUserCred = {
      ...credential,
      protection: {
        jws: await this.createJWS(credential)
      }
    };
    await this.sessionCache.delete(sessionId);
    return protectedCred;
  }

  private async createJWS(cred: Omit<HttpCredential, "protection">): Promise<string> {
    const dagJWS = await this.didService.createJWS(cred);
    const [jwsSignature] = dagJWS.signatures;
    return jwsSignature?.protected + ".." + jwsSignature?.signature;
  }

  private async createProofs(attributes: FarcasterUserAttributes): Promise<HttpCredential["proofs"]> {
    try {
      const signProver = this.credProver.signProver("mina:poseidon-pasta");
      const reference = signProver.issuerReference;
      const signProof = await signProver.signAttributes(attributes, o1jsEthTransSchema);
      const proofs: Record<SignProofType, Record<string, SignatureProof>> = {
        "mina:poseidon-pasta": {}
      };
      proofs["mina:poseidon-pasta"][reference] = signProof;
      return proofs;
    } catch (e) {
      throw e;
    }
  }

  private toAttributes({
    result: { user }
  }: FarquestType["User"], {
    challengeReq: {
      validUntil,
      subject
    }
  }: Session): FarcasterUserAttributes {
    const now = new Date();
    const oneWeekMS = 7 * 24 * 60 * 60 * 1000;
    return {
      type: this.id,
      issuanceDate: now.toISOString(),
      validFrom: now.toISOString(),
      validUntil: validUntil
        ? validUntil
        : new Date(now.getTime() + oneWeekMS).toISOString(),
      subject: {
        id: subject.id,
        fid: user.fid,
        followingCount: user.followingCount,
        followerCount: user.followerCount,
        custodyAddress: user.custodyAddress,
        verifiedAddress: user.connectedAddress,
        username: user.username,
        displayName: user.displayName,
        registeredAt: new Date(user.registeredAt).toISOString()
      }

    };
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

  private async getFarcasterUser(address: string): Promise<FarquestType["User"]> {
    const _user = await this.farquestService.getUserByVerifiedAddress(address);
    const user = _user
      ? _user
      : await this.farquestService.getUserByCustodyAddress(address);
    if (user === null) throw new IssuerException({
      code: IEC.ISSUE_DENIED,
      msg: `No farcaster user with address: ${address}`
    });
    return user;
  }

  dispose(): void | PromiseLike<void> {
    this.sessionCache.clear();
  };
}
