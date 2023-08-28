import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  ICredentialIssuer,
} from "../../../base/service/credentials.js";
import { type Disposable, tokens } from "typed-inject";
import { ProofService } from "../../../base/service/proof.service.js";
import { DIDService } from "../../../base/service/did.service.js";
import { MultiSignService } from "../../../base/service/multi-sign.service.js";
import { fromIssueMessage, toIssueMessage } from "../../../base/service/message.service.js";
import { absoluteId } from "../../../util/id.util.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import sortKeys from "sort-keys";
import { AnyObj, extractProps } from "../../../util/model.util.js";
import {
  CanIssueResp,
  Credential,
  CredentialType,
  EthAccountChallenge,
  EthAccountChallengeReq,
  EthAccountIssueReq,
  ethAccountProps,
  EthAccountVC
} from "@sybil-center/sdk/types";

export interface EthAccountSession {
  issueMessage: string;
}

export interface EthProofResult {
  chainId: string;
  address: string;
}

export interface GetEthAccountVC {
  issuerDID: string;
  subjectId: string;
  ethAddress: string;
  expirationDate?: Date;
  custom?: AnyObj;
  props?: string[];
}

function getEthAccountVC(args: GetEthAccountVC): EthAccountVC {
  const origin = {
    chainId: "eip155:1",
    address: args.ethAddress
  };
  const ethereum = extractProps(origin, args.props);
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "EthereumAccount"],
      issuer: { id: args.issuerDID },
      issuanceDate: new Date(),
      credentialSubject: {
        id: args.subjectId,
        ethereum: {
          ...ethereum
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
    private readonly proofService: ProofService,
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
    const issueMessage = toIssueMessage({
      type: this.providedCredential,
      custom: custom,
      expirationDate: expirationDate,
      subjectId: req.subjectId,
      ethereumProps: {
        value: req.props,
        default: ethAccountProps
      }
    });
    this.sessionCache.set(sessionId, { issueMessage: issueMessage });
    return {
      sessionId: sessionId,
      issueMessage: issueMessage,
    };
  }

  async canIssue(): Promise<CanIssueResp> {
    return { canIssue: true };
  }

  async issue({
    sessionId,
    signature,
  }: EthAccountIssueReq): Promise<Credential> {
    const { issueMessage } = this.sessionCache.get(sessionId);
    const { custom, expirationDate, subjectId, ethereumProps } = fromIssueMessage(issueMessage);
    const ethAddress = await this.multiSignService.ethereum.verify({
      signature: signature,
      message: issueMessage,
      address: subjectId.split(":").pop()!
    });
    this.sessionCache.delete(sessionId);
    const vc = getEthAccountVC({
      issuerDID: this.didService.id,
      subjectId: subjectId,
      ethAddress: ethAddress,
      custom: custom,
      expirationDate: expirationDate,
      props: ethereumProps
    });
    return this.proofService.sign("JsonWebSignature2020", vc);
  }

  get providedCredential(): CredentialType {
    return "EthereumAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
