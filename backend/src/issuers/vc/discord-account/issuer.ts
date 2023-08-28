import type { ICredentialIssuer, IOAuthCallback, } from "../../../base/service/credentials.js";
import { DEFAULT_CREDENTIAL_CONTEXT, DEFAULT_CREDENTIAL_TYPE } from "../../../base/service/credentials.js";
import { Disposable, tokens } from "typed-inject";
import { DiscordService, type DiscordUser } from "../../../base/service/external/discord.service.js";
import { ProofService } from "../../../base/service/proof.service.js";
import { DIDService } from "../../../base/service/did.service.js";
import { ClientError } from "../../../backbone/errors.js";
import type { IMultiSignService } from "../../../base/service/multi-sign.service.js";
import { fromIssueMessage, toIssueMessage } from "../../../base/service/message.service.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { absoluteId } from "../../../util/id.util.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../base/types/oauth.js";
import { AnyObj, extractProps } from "../../../util/model.util.js";
import {
  CanIssueReq,
  CanIssueResp,
  Credential,
  CredentialType,
  DiscordAccountChallenge,
  DiscordAccountChallengeReq,
  DiscordAccountIssueReq,
  discordAccountProps,
  DiscordAccountVC
} from "@sybil-center/sdk/types";

export type DiscordOAuthSession = {
  redirectUrl?: URL;
  issueMessage: string;
  code?: string;
};

export type GetDiscordAccountVC = {
  issuer: string;
  subjectId: string;
  discordUser: DiscordUser;
  custom?: AnyObj;
  expirationDate?: Date;
  props?: string[];
}

export function getDiscordAccountVC(args: GetDiscordAccountVC): DiscordAccountVC {
  const discordUser = extractProps(args.discordUser, args.props);
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, "DiscordAccount"],
      issuer: { id: args.issuer },
      credentialSubject: {
        id: args.subjectId,
        discord: {
          ...discordUser
        },
        custom: args.custom
      },
      expirationDate: args.expirationDate,
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

export class DiscordAccountIssuer
  implements ICredentialIssuer<
    DiscordAccountIssueReq,
    Credential,
    DiscordAccountChallengeReq,
    DiscordAccountChallenge,
    CanIssueReq,
    CanIssueResp
  >,
    IOAuthCallback,
    Disposable {
  static inject = tokens(
    "multiSignService",
    "proofService",
    "didService",
    "config"
  );

  readonly discordService: DiscordService;
  private readonly sessionCache: TimedCache<string, DiscordOAuthSession>;

  constructor(
    private readonly multiSignService: IMultiSignService,
    private readonly proofService: ProofService,
    private readonly didService: DIDService,
    config: {
      oAuthSessionTtl: number;
      pathToExposeDomain: URL;
      discordClientId: string;
      discordClientSecret: string;
    }
  ) {
    this.discordService = new DiscordService(config);
    this.sessionCache = new TimedCache(config.oAuthSessionTtl);
  }

  async getChallenge(req: DiscordAccountChallengeReq): Promise<DiscordAccountChallenge> {
    const custom = req.custom;
    const expirationDate = req.expirationDate;
    const redirectUrl = req.redirectUrl
      ? new URL(req.redirectUrl)
      : undefined;

    const issueMessage = toIssueMessage({
      type: this.providedCredential,
      custom: custom,
      expirationDate: expirationDate,
      subjectId: req.subjectId,
      discordProps: {
        value: req.props,
        default: discordAccountProps
      }
    });
    const sessionId = absoluteId();
    this.sessionCache.set(sessionId, {
      redirectUrl: redirectUrl,
      issueMessage: issueMessage
    });
    const authUrl = this.discordService.getOAuthLink({
      sessionId: sessionId,
      credentialType: this.providedCredential,
      scope: ["identify"]
    });
    return {
      sessionId: sessionId,
      authUrl: authUrl.href,
      issueMessage: issueMessage
    };
  }


  async handleOAuthCallback(
    code: string, state: OAuthState
  ): Promise<URL | undefined> {
    const sessionId = state.sessionId;
    const session = this.sessionCache.get(sessionId);
    if (!session) throw new ClientError(`No session with id = ${sessionId}`);
    session.code = code;
    this.sessionCache.set(sessionId, session);
    return session.redirectUrl;
  }

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssueResp> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signature
  }: DiscordAccountIssueReq): Promise<Credential> {
    const session = this.sessionCache.get(sessionId);
    const { code, issueMessage } = session;
    if (!code) {
      throw new ClientError("Discord processing your authorization. Wait!");
    }
    const { custom, expirationDate, subjectId, discordProps } = fromIssueMessage(issueMessage);
    await this.multiSignService.verify({
      subjectId: subjectId,
      message: issueMessage,
      signature: signature
    });
    const accessToken = await this.discordService.getAccessToken(code);
    const discordUser = await this.discordService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const credential = getDiscordAccountVC({
      issuer: this.didService.id,
      subjectId: subjectId,
      discordUser: discordUser,
      custom: custom,
      expirationDate: expirationDate,
      props: discordProps
    });
    return this.proofService.sign("JsonWebSignature2020", credential);
  }

  get providedCredential(): CredentialType {
    return "DiscordAccount";
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
