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

export interface EthAccountPayloadReq {
  body: {
    custom?: object;
  };
}

export interface EthAccOwnershipVC extends VC {
  credentialSubject: {
    id: string;
    ethereum: {
      address: string;
    }
    custom?: { [key: string]: any };
  };
}

export interface EthAccOwnershipIssueVCPayload {
  sessionId: string;
  issueChallenge: string;
  ownerChallenge: string;
}

/**
 * Request interface for generate ethereum account ownership VC
 */
export interface EthAccOwnershipRequest {
  /**
   * sign message id
   */
  sessionId: string;

  /**
   * signed message by eth private key
   */
  signature: string;

  publicId: string;
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

function getEthAccountOwnershipVC(
  issuer: string,
  subjectDID: string,
  ethAddress: string,
  custom?: object
): EthAccOwnershipVC {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.EthereumAccount],
      issuer: { id: issuer },
      issuanceDate: new Date(),
      credentialSubject: {
        id: subjectDID,
        ethereum: {
          address: ethAddress
        },
        custom: custom
      }
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

/**
 * Issuer provide
 */
export class EthereumAccountIssuer
  implements ICredentialIssuer<
    EthAccOwnershipRequest,
    VC,
    EthAccountPayloadReq,
    EthAccOwnershipIssueVCPayload,
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
  }: EthAccountPayloadReq): Promise<EthAccOwnershipIssueVCPayload> {
    const custom = body?.custom;
    const issueChallenge = toIssueChallenge(this.getProvidedVC(), custom);
    const ownerChallenge = ethOwnerChallenge();
    const sessionId = absoluteId();
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

  async issue(issueReq: EthAccOwnershipRequest): Promise<VC> {
    const { subjectDID, address, issueChallenge } = await this.#resolve(issueReq);
    const { custom } = fromIssueChallenge(issueChallenge);
    this.sessionCache.delete(issueReq.sessionId);
    const vc = getEthAccountOwnershipVC(
      this.didService.id,
      subjectDID,
      address,
      custom
    );
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
    issueReq: EthAccOwnershipRequest
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
