import {
  CanIssueRes,
  ChainOwnerProof,
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
  IOwnerProofHandler,
  VC
} from "../../../../base/credentials.js";
import { type Disposable, tokens } from "typed-inject";
import { IProofService } from "../../../../base/service/proof-service.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { MultiSignService, SignAlgAlias } from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../util/challenge.util.js";
import { absoluteId } from "../../../../util/id-util.js";
import { TimedCache } from "../../../../base/timed-cache.js";
import sortKeys from "sort-keys";
import { ClientError } from "../../../../backbone/errors.js";
import { randomUUID } from "crypto";
import { AnyObject } from "../../../../util/model.util.js";

export interface EthAccountChallengeReq {
  body: {
    custom?: object;
    expirationDate?: Date;
  };
}

export interface EthAccountVC extends VC {
  credentialSubject: {
    id: string;
    ethereum: {
      address: string;
      chainId: string;
    }
    custom?: AnyObject;
  };
}

export interface EthAccountChallenge {
  sessionId: string;
  issueChallenge: string;
  ownerChallenge: string;
}

/** Request interface for generate ethereum account ownership VC */
export interface EthAccountReq {
  /** Sign message id */
  sessionId: string;

  /** Signed message by private key */
  signature: string;

  /** Public key or chain address */
  publicId: string;

  /** Algorithm of signing */
  signAlg?: SignAlgAlias;
}

export interface EthAccountSession {
  issueChallenge: string;
  ownerChallenge: string;
  address?: string;
}

export interface EthProofResult {
  chainId: string;
  address: string;
}

export interface GetEthAccountVC {
  issuerDID: string;
  subjectDID: string;
  ethAddress: string;
  expirationDate?: Date;
  custom?: AnyObject;
}

function getEthAccountVC(args: GetEthAccountVC): EthAccountVC {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.EthereumAccount],
      issuer: { id: args.issuerDID },
      issuanceDate: new Date(),
      credentialSubject: {
        id: args.subjectDID,
        ethereum: {
          chainId: "eip155:1",
          address: args.ethAddress
        },
        custom: args.custom
      },
      expirationDate: args.expirationDate
    },
    { deep: true }
  );
}

function ethOwnerChallenge(): string {
  return JSON.stringify({
    description: `Sign this message to proof Ethereum account ownership`,
    nonce: randomUUID()
  }, null, " ");
}

/** ETH Account Issuer */
export class EthereumAccountIssuer
  implements ICredentialIssuer<
    EthAccountReq,
    VC,
    EthAccountChallengeReq,
    EthAccountChallenge,
    void,
    CanIssueRes
  >,
    IOwnerProofHandler<ChainOwnerProof, EthProofResult>,
    Disposable {
  static inject = tokens(
    "proofService",
    "multiSignService",
    "didService",
    "config"
  );

  constructor(
    private readonly proofService: IProofService,
    private readonly multiSignService: MultiSignService,
    private readonly didService: DIDService,
    config: { signatureMessageTTL: number },
    private readonly sessionCache = new TimedCache<string, EthAccountSession>(
      config.signatureMessageTTL
    )
  ) {}

  async getChallenge({
    body
  }: EthAccountChallengeReq): Promise<EthAccountChallenge> {
    const custom = body?.custom;
    const expirationDate = body?.expirationDate;
    const sessionId = absoluteId();
    const ownerChallenge = ethOwnerChallenge();
    const issueChallenge = toIssueChallenge({
      type: this.getProvidedVC(),
      custom: custom,
      expirationDate: expirationDate
    });
    this.sessionCache.set(sessionId, { issueChallenge, ownerChallenge });
    return {
      sessionId: sessionId,
      issueChallenge: issueChallenge,
      ownerChallenge: ownerChallenge
    };
  }
  async handleOwnerProof({
    sessionId,
    publicId,
    signature
  }: ChainOwnerProof): Promise<EthProofResult> {
    const session = this.sessionCache.get(sessionId);
    if (session.address)
      throw new ClientError(`Address has been proofed with session=${sessionId}`);
    const ethAddress = await this.multiSignService
      .ethereum
      .verifySign(signature, session.ownerChallenge, publicId);
    session.address = ethAddress;
    return { address: ethAddress, chainId: "eip155:1" };
  }

  async canIssue(): Promise<CanIssueRes> {
    return { canIssue: true };
  }

  async issue(issueReq: EthAccountReq): Promise<VC> {
    const { subjectDID, address, issueChallenge } = await this.#resolve(issueReq);
    const { custom, expirationDate } = fromIssueChallenge(issueChallenge);
    this.sessionCache.delete(issueReq.sessionId);
    const vc = getEthAccountVC({
      issuerDID: this.didService.id,
      subjectDID: subjectDID,
      ethAddress: address,
      custom: custom,
      expirationDate: expirationDate
    });
    return this.proofService.jwsSing(vc);
  }

  /**
   * If ownership of ETH account was handled by {@link handleOwnerProof},
   * method will return proofed ETH address and referenced to subject did.
   * Else ownership proof and ETH address will be calculated from input
   * @param issueReq object to issue vc
   * @private
   */
  async #resolve(
    issueReq: EthAccountReq
  ): Promise<{ address: string, subjectDID: string, issueChallenge: string }> {
    const { sessionId, signAlg, signature, publicId } = issueReq;

    const { address, issueChallenge } = this.sessionCache.get(sessionId);
    if (address) {
      const subjectId = await this.multiSignService
        .signAlg(signAlg)
        .did(signature, issueChallenge, publicId);
      return { address, subjectDID: subjectId, issueChallenge };
    }
    const ethAddress = await this.multiSignService
      .ethereum
      .verifySign(signature, issueChallenge, publicId);
    const didPrefix = this.multiSignService.ethereum.didPrefix;
    return {
      address: ethAddress,
      subjectDID: `${didPrefix}:${ethAddress}`,
      issueChallenge
    };
  }

  getProvidedVC(): VCType {
    return VCType.EthereumAccount;
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
