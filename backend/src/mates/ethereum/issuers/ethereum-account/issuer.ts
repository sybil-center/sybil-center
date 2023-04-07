import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
} from "../../../../base/service/credentials.js";
import { type Disposable, tokens } from "typed-inject";
import { IProofService } from "../../../../base/service/proof.service.js";
import { DIDService } from "../../../../base/service/did.service.js";
import { MultiSignService } from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../base/service/challenge.service.js";
import { absoluteId } from "../../../../util/id.util.js";
import { TimedCache } from "../../../../base/service/timed-cache.js";
import sortKeys from "sort-keys";
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

/** ETH Account Issuer */
export class EthereumAccountIssuer
  implements ICredentialIssuer<
    EthAccountIssueReq,
    Credential,
    EthAccountChallengeReq,
    EthAccountChallenge
  >, Disposable {
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
    const issueChallenge = toIssueChallenge({
      type: this.providedCredential,
      custom: custom,
      expirationDate: expirationDate,
      publicId: req.publicId
    });
    this.sessionCache.set(sessionId, { issueChallenge });
    return {
      sessionId: sessionId,
      issueChallenge: issueChallenge,
    };
  }

  async canIssue(): Promise<CanIssueResp> {
    return { canIssue: true };
  }

  async issue({
    sessionId,
    signature,
  }: EthAccountIssueReq): Promise<Credential> {
    const { issueChallenge } = this.sessionCache.get(sessionId);
    const { custom, expirationDate, publicId } = fromIssueChallenge(issueChallenge);
    const ethAddress = await this.multiSignService
      .ethereum
      .verifySign(signature, issueChallenge, publicId);
    this.sessionCache.delete(sessionId);
    const vc = getEthAccountVC({
      issuerDID: this.didService.id,
      subjectDID: `${this.multiSignService.ethereum.didPrefix}:${ethAddress}`,
      ethAddress: ethAddress,
      custom: custom,
      expirationDate: expirationDate
    });
    return this.proofService.jwsSing(vc);
  }

  get providedCredential(): CredentialType {
    return "EthereumAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
