import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE,
  IVCCredentialIssuer,
} from "../../../services/vc/vc-issuer.js";
import { type Disposable, tokens } from "typed-inject";
import { VCSignatureProver } from "../../../services/vc/vc-signature-prover.js";
import { DIDService } from "../../../services/did.service.js";
import { VCMultiSignatureService } from "../../../services/vc/vc-sign-message/multi-sign.service.js";
import { fromIssueMessage, toIssueMessage } from "../../../util/message.util.js";
import { absoluteId } from "../../../util/id.util.js";
import { TimedCache } from "../../../services/timed-cache.js";
import sortKeys from "sort-keys";
import { extractProps } from "../../../util/model.util.js";
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
  custom?: Record<string, any>;
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
  implements IVCCredentialIssuer<
    EthAccountIssueReq,
    Credential,
    EthAccountChallengeReq,
    EthAccountChallenge
  >, Disposable {
  static inject = tokens(
    "vcSignatureProver",
    "vcMultiSignatureService",
    "didService",
    "config"
  );

  constructor(
    private readonly vcSignatureProver: VCSignatureProver,
    private readonly vcMultiSignatureService: VCMultiSignatureService,
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
    const ethAddress = await this.vcMultiSignatureService.ethereum.verify({
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
    return this.vcSignatureProver.sign("JsonWebSignature2020", vc);
  }

  get providedCredential(): CredentialType {
    return "EthereumAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
