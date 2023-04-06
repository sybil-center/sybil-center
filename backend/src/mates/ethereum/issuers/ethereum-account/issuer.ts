import {
  ChainOwnerProof,
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
  IOwnerProofHandler,
} from "../../../../base/service/credentials.js";
import { type Disposable, tokens } from "typed-inject";
import { IProofService } from "../../../../base/service/proof.service.js";
import { DIDService } from "../../../../base/service/did.service.js";
import { MultiSignService } from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../base/service/challenge.service.js";
import { absoluteId } from "../../../../util/id.util.js";
import { TimedCache } from "../../../../base/service/timed-cache.js";
import sortKeys from "sort-keys";
import { ClientError, ServerError } from "../../../../backbone/errors.js";
import { randomUUID } from "crypto";
import { AnyObj } from "../../../../util/model.util.js";
import {
  CanIssueResp,
  Credential,
  CredentialType,
  EthAccountChallenge,
  EthAccountChallengeReq,
  EthAccountIssueReq,
  EthAccountVC
} from "@sybil-center/sdk/types";

export interface EthAccountSession {
  issueChallenge: string;
  ownerChallenge?: string;
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
  custom?: AnyObj;
}

function getEthAccountVC(args: GetEthAccountVC): EthAccountVC {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "EthereumAccount"],
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

function ethOwnerChallenge(ethAddress?: string): string | undefined {
  if (!ethAddress) return undefined;
  return JSON.stringify({
    description: `Sign this message to proof Ethereum account ownership with address '${ethAddress}'`,
    nonce: randomUUID(),
    address: ethAddress
  }, null, " ");
}

type FromOwnerChallenge = {
  address: string;
  description: string;
  nonce: string;
}

function fromEthOwnerChallenge(challenge: string): FromOwnerChallenge {
  try {
    return JSON.parse(challenge) as FromOwnerChallenge;
  } catch (e: any) {
    throw new ServerError("Internal server error", {
      props: {
        _place: fromEthOwnerChallenge.name,
        _log: e
      }
    });
  }
}

/** ETH Account Issuer */
export class EthereumAccountIssuer
  implements ICredentialIssuer<
    EthAccountIssueReq,
    Credential,
    EthAccountChallengeReq,
    EthAccountChallenge
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

  async getChallenge(req: EthAccountChallengeReq): Promise<EthAccountChallenge> {
    const custom = req?.custom;
    const expirationDate = req?.expirationDate;
    const sessionId = absoluteId();
    const ownerChallenge = ethOwnerChallenge(req.ethAddress);
    const issueChallenge = toIssueChallenge({
      type: this.providedCredential,
      custom: custom,
      expirationDate: expirationDate,
      publicId: req.publicId
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
    signature
  }: ChainOwnerProof): Promise<EthProofResult> {
    const session = this.sessionCache.get(sessionId);
    const ownerChallenge = session.ownerChallenge;
    if (!ownerChallenge) throw new ClientError('Do not have challenge to proof');
    const { address: ethAddress } = fromEthOwnerChallenge(ownerChallenge);
    await this.multiSignService
      .ethereum
      .verifySign(signature, ownerChallenge, ethAddress);

    session.address = ethAddress;
    return { address: ethAddress, chainId: "eip155:1" };
  }

  async canIssue(): Promise<CanIssueResp> {
    return { canIssue: true };
  }

  async issue(issueReq: EthAccountIssueReq): Promise<Credential> {
    const { subjectDID, ethAddress, issueChallenge } = await this.#resolve(issueReq);
    const { custom, expirationDate } = fromIssueChallenge(issueChallenge);
    this.sessionCache.delete(issueReq.sessionId);
    const vc = getEthAccountVC({
      issuerDID: this.didService.id,
      subjectDID: subjectDID,
      ethAddress: ethAddress,
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
    issueReq: EthAccountIssueReq
  ): Promise<{ ethAddress: string, subjectDID: string, issueChallenge: string }> {
    const { sessionId, signType, signature } = issueReq;

    const { address, issueChallenge } = this.sessionCache.get(sessionId);
    const {publicId } = fromIssueChallenge(issueChallenge);
    if (address) {
      const subjectId = await this.multiSignService
        .signAlg(signType)
        .did(signature, issueChallenge, publicId);
      return { ethAddress: address, subjectDID: subjectId, issueChallenge };
    }
    const ethAddress = await this.multiSignService
      .ethereum
      .verifySign(signature, issueChallenge, publicId);
    const didPrefix = this.multiSignService.ethereum.didPrefix;
    return {
      ethAddress: ethAddress,
      subjectDID: `${didPrefix}:${ethAddress}`,
      issueChallenge
    };
  }

  get providedCredential(): CredentialType {
    return "EthereumAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
